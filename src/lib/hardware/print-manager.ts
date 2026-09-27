import { BridgeError, type BridgeResult, bridgePrint, isBridgeAvailable, getPairing } from './bridge-client';
import { documentsApi, type DocumentType, type PrintChannel, type PrintJob, type PrintJobStatus } from './documents-api';
import { randomId } from '@/lib/uuid';

/**
 * One way to print any document (spec §15):
 * 1. record a print job on the server, which says whether this is the original or
 *    COPY #n (and needs sales.reprint for copies);
 * 2. print it: ESC/POS through the paired print bridge when the document has a
 *    thermal layout and the bridge answers, else the browser print dialog;
 * 3. report the outcome (printed / failed / unknown; the browser dialog can only
 *    say "sent").
 * A bridge print that failed before anything was sent falls back to the browser.
 * Nothing here ever opens the cash drawer: printing and retries never kick it.
 */
export interface PrintRequest {
  documentType: DocumentType;
  // null: not on the server yet (offline sale) - printed without a print job
  documentId: string | null;
  // Ask for a copy (the server may also turn an original into a copy)
  copy: boolean;
  // ESC/POS for the bridge, given the copy number; absent: browser only
  escpos?: ((copyNumber: number | null) => Uint8Array) | null;
  // Show the document with this copy number and open the print dialog
  browserPrint: (copyNumber: number | null) => void | Promise<void>;
  // Offline: the copy number printed without asking the server
  localCopyNumber?: number | null;
  offline?: boolean;
}

export interface PrintOutcome {
  job: PrintJob | null;
  copyNumber: number | null;
  status: PrintJobStatus;
  channel: PrintChannel;
  error: string | null;
}

export interface PrintDeps {
  api: Pick<typeof documentsApi, 'createPrintJob' | 'updatePrintJob' | 'retryPrintJob'>;
  bridge: {
    available: () => Promise<boolean>;
    print: (bytes: Uint8Array, options: { commandId: string; printerId?: string | null }) => Promise<BridgeResult>;
  };
}

export const defaultPrintDeps: PrintDeps = {
  api: documentsApi,
  bridge: { available: isBridgeAvailable, print: bridgePrint },
};

// An API call that got no answer at all (connection lost)
const isNetworkError = (error: unknown) =>
  !!error && typeof error === 'object' && 'isAxiosError' in error && !(error as { response?: unknown }).response;

// A bridge call that threw: refused/unreachable/rejected → nothing printed; timeout → maybe
function outcomeOf(error: unknown): BridgeResult {
  const code = error instanceof BridgeError ? error.code : 'unknown';
  const message = error instanceof Error ? error.message : String(error);
  return { status: code === 'timeout' ? 'unknown' : 'failed', error: message };
}

async function sendToBridge(deps: PrintDeps, bytes: Uint8Array, commandId: string): Promise<BridgeResult> {
  try {
    return await deps.bridge.print(bytes, { commandId, printerId: getPairing()?.printerId ?? null });
  } catch (error) {
    return outcomeOf(error);
  }
}

async function runJob(job: PrintJob, request: PrintRequest, deps: PrintDeps, useBridge: boolean): Promise<PrintOutcome> {
  const copyNumber = job.copy ? job.copyNumber : null;
  if (useBridge && request.escpos) {
    // The job id is the bridge command id: the bridge never prints one job twice
    const result = await sendToBridge(deps, request.escpos(copyNumber), job.id);
    await deps.api.updatePrintJob(job.id, result.status, result.error).catch(() => undefined);
    if (result.status === 'failed') {
      // Nothing reached the printer: print through the browser (same original/copy)
      const next = await deps.api.createPrintJob({
        documentType: job.documentType,
        documentId: job.documentId,
        copy: job.copy,
        channel: 'browser',
      });
      const fallback = await runJob(next, request, deps, false);
      return { ...fallback, error: result.error };
    }
    return { job, copyNumber, status: result.status, channel: 'bridge', error: result.error };
  }
  await request.browserPrint(copyNumber);
  // The print dialog cannot tell whether paper came out
  await deps.api.updatePrintJob(job.id, 'sent').catch(() => undefined);
  return { job, copyNumber, status: 'sent', channel: 'browser', error: null };
}

async function printLocally(request: PrintRequest, deps: PrintDeps, useBridge: boolean): Promise<PrintOutcome> {
  const copyNumber = request.copy ? (request.localCopyNumber ?? 1) : null;
  if (useBridge && request.escpos) {
    const result = await sendToBridge(deps, request.escpos(copyNumber), randomId());
    if (result.status !== 'failed') return { job: null, copyNumber, status: result.status, channel: 'bridge', error: result.error };
  }
  await request.browserPrint(copyNumber);
  return { job: null, copyNumber, status: 'sent', channel: 'browser', error: null };
}

export async function printDocument(request: PrintRequest, deps: PrintDeps = defaultPrintDeps): Promise<PrintOutcome> {
  const useBridge = !!request.escpos && (await deps.bridge.available().catch(() => false));
  if (request.offline || !request.documentId) return printLocally(request, deps, useBridge);
  let job: PrintJob;
  try {
    job = await deps.api.createPrintJob({
      documentType: request.documentType,
      documentId: request.documentId,
      copy: request.copy,
      channel: useBridge ? 'bridge' : 'browser',
      printerId: useBridge ? (getPairing()?.printerId ?? null) : null,
    });
  } catch (error) {
    // Connection lost: the till still prints (as when offline)
    if (isNetworkError(error)) return printLocally(request, deps, useBridge);
    throw error;
  }
  return runJob(job, request, deps, useBridge);
}

/**
 * Print a failed or uncertain job again. The server makes an uncertain one a COPY.
 * Only the document is printed again - never the drawer kick.
 */
export async function retryPrint(previous: PrintJob, request: PrintRequest, deps: PrintDeps = defaultPrintDeps): Promise<PrintOutcome> {
  const job = await deps.api.retryPrintJob(previous.id);
  const useBridge = previous.channel === 'bridge' && !!request.escpos && (await deps.bridge.available().catch(() => false));
  return runJob(job, request, deps, useBridge);
}
