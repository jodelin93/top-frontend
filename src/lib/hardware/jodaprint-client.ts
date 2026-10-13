/**
 * Client for the JodaPrint agent installed on the till computer (@jodaprint/sdk,
 * wss://localhost:8182). The agent prints on the computer's own printers (USB,
 * network...) and opens the cash drawer.
 *
 * Every request to the agent is signed by the POS server (POST
 * /hardware/jodaprint/sign): the private key stays there, and only signed-in store
 * staff get a signature. Without a connection to the server nothing can be signed,
 * so offline the POS prints through the browser dialog instead.
 *
 * The receipt printer, its paper width and the label printer are chosen per browser
 * (localStorage), i.e. per till: by default the printers with the aliases "receipt"
 * and "label" in the JodaPrint dashboard.
 */
import { JodaPrint, JodaPrintError, type AgentInfo, type Job, type Printer, type PrinterRef } from '@jodaprint/sdk';
import apiClient from '@/lib/api/client';
import type { BridgeResult } from './bridge-client';
import type { PaperWidth } from './escpos';
import { toBase64 } from './escpos';

const STORAGE_KEY = 'pos_jodaprint';
export const DEFAULT_ALIAS = 'receipt';
export const DEFAULT_LABEL_ALIAS = 'label';
// How long a receipt may take before the till stops waiting (the agent keeps retrying)
const PRINT_WAIT_MS = 15_000;

export interface AgentSettings {
  // Receipt printer: an alias from the JodaPrint dashboard, or a printer id
  printer: { alias: string } | { id: string };
  widthMm: PaperWidth;
  // Label printer (product labels): an alias or a printer id
  labelPrinter: { alias: string } | { id: string };
}

// Which printer of the till a job is for
export type AgentTarget = 'receipt' | 'label';

export interface AgentConfig {
  enabled: boolean;
  orgId: string | null;
}

export type AgentPrinter = Printer;
export type { AgentInfo };

// ---------------------------------------------------------------------------
// Settings (per browser)

const DEFAULT_SETTINGS: AgentSettings = {
  printer: { alias: DEFAULT_ALIAS },
  widthMm: 80,
  labelPrinter: { alias: DEFAULT_LABEL_ALIAS },
};

const refOf = (settings: AgentSettings, target: AgentTarget) => (target === 'label' ? settings.labelPrinter : settings.printer);

export function getAgentSettings(): AgentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AgentSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAgentSettings(changes: Partial<AgentSettings>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getAgentSettings(), ...changes }));
  } catch {
    /* storage unavailable: the defaults are used */
  }
}

/** What print jobs record as their printer, e.g. "jodaprint:receipt" */
export function agentPrinterLabel(settings = getAgentSettings(), target: AgentTarget = 'receipt'): string {
  const ref = refOf(settings, target);
  return `jodaprint:${'alias' in ref ? ref.alias : ref.id}`;
}

/** Is this printer of the agent the one chosen for receipts / for labels? */
export function isAgentPrinter(printer: Pick<Printer, 'id' | 'alias'>, settings: AgentSettings, target: AgentTarget): boolean {
  const ref = refOf(settings, target);
  return 'alias' in ref ? printer.alias === ref.alias : printer.id === ref.id;
}

// ---------------------------------------------------------------------------
// Connection

// The part of the SDK used here (tests pass a fake)
export type AgentSdk = Pick<JodaPrint, 'connect' | 'print' | 'on' | 'isConnected' | 'disconnect'> & {
  printers: Pick<JodaPrint['printers'], 'list'>;
  jobs: Pick<JodaPrint['jobs'], 'get' | 'cancel'>;
  drawer: JodaPrint['drawer'];
};

export interface AgentDeps {
  config: () => Promise<AgentConfig>;
  create: (orgId: string) => AgentSdk;
  online: () => boolean;
}

const sign = async (payload: unknown) => (await apiClient.post('/hardware/jodaprint/sign', payload)).data;

export const defaultAgentDeps: AgentDeps = {
  config: async () => (await apiClient.get('/hardware/jodaprint')).data,
  create: (orgId) => new JodaPrint({ orgId, signer: sign, timeoutMs: 20_000, connectTimeoutMs: 1500 }),
  online: () => typeof navigator === 'undefined' || navigator.onLine,
};

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const codeOf = (error: unknown): string | undefined =>
  error instanceof JodaPrintError ? error.code : (error as { code?: string } | null)?.code;

let cached: { deps: AgentDeps; orgId: string; sdk: AgentSdk } | null = null;
let configCache: { at: number; value: AgentConfig } | null = null;
let availableCache: { at: number; value: boolean } | null = null;

export function resetAgent() {
  cached?.sdk.disconnect();
  cached = null;
  configCache = null;
  availableCache = null;
}

/** Is JodaPrint set up on the server? (cached 5 min; off when the server can't be reached) */
export async function agentConfig(deps: AgentDeps = defaultAgentDeps, fresh = false): Promise<AgentConfig> {
  if (!fresh && configCache && Date.now() - configCache.at < 5 * 60_000) return configCache.value;
  const value = await deps.config().catch(() => ({ enabled: false, orgId: null }));
  configCache = { at: Date.now(), value };
  return value;
}

async function sdkFor(deps: AgentDeps): Promise<AgentSdk | null> {
  const config = await agentConfig(deps);
  if (!config.enabled || !config.orgId) return null;
  if (!cached || cached.deps !== deps || cached.orgId !== config.orgId) {
    cached?.sdk.disconnect();
    cached = { deps, orgId: config.orgId, sdk: deps.create(config.orgId) };
  }
  return cached.sdk;
}

/**
 * The agent on this computer (version, organization...). Without one, `problem` says
 * why: AGENT_NOT_FOUND, ORIGIN_NOT_ALLOWED (this POS address is not allowed in the
 * JodaPrint dashboard), AGENT_CERT_UNTRUSTED...; null when JodaPrint is not set up.
 */
export async function agentConnection(
  deps: AgentDeps = defaultAgentDeps
): Promise<{ info: AgentInfo | null; problem: { code: string | undefined; message: string } | null }> {
  const sdk = await sdkFor(deps);
  if (!sdk) return { info: null, problem: null };
  try {
    return { info: await sdk.connect(), problem: null };
  } catch (error) {
    return { info: null, problem: { code: codeOf(error), message: messageOf(error) } };
  }
}

export const agentInfo = async (deps: AgentDeps = defaultAgentDeps) => (await agentConnection(deps)).info;

/**
 * Receipts can go through the agent: JodaPrint is set up, the server can sign
 * (online) and an activated agent answers on this computer. Cached 10 s.
 */
export async function isAgentAvailable(deps: AgentDeps = defaultAgentDeps, fresh = false): Promise<boolean> {
  if (!deps.online()) return false;
  if (!fresh && availableCache && Date.now() - availableCache.at < 10_000) return availableCache.value;
  const info = await agentInfo(deps);
  const value = !!info && info.orgId !== null;
  availableCache = { at: Date.now(), value };
  return value;
}

export async function agentPrinters(deps: AgentDeps = defaultAgentDeps): Promise<AgentPrinter[]> {
  const sdk = await sdkFor(deps);
  if (!sdk) return [];
  return sdk.printers.list();
}

/**
 * Labels can go straight to the label printer: the agent answers and it has the
 * printer chosen for labels on this till.
 */
export async function isAgentLabelPrinterAvailable(deps: AgentDeps = defaultAgentDeps): Promise<boolean> {
  if (!(await isAgentAvailable(deps))) return false;
  const settings = getAgentSettings();
  try {
    return (await agentPrinters(deps)).some((printer) => isAgentPrinter(printer, settings, 'label'));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Printing

/** Resolves with the job once it is printed, failed or cancelled; null after `ms` */
function waitForJob(sdk: AgentSdk, jobId: string, ms: number): Promise<Job | null> {
  const done = (job: Job) => job.state === 'printed' || job.state === 'failed' || job.state === 'cancelled';
  return new Promise((resolve) => {
    let finished = false;
    const finish = (job: Job | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(poll);
      off();
      resolve(job);
    };
    const off = sdk.on('job.updated', (job) => {
      if (job.id === jobId && done(job)) finish(job);
    });
    // Events can be missed (reconnect): ask every second too
    const check = () =>
      sdk.jobs
        .get(jobId)
        .then((job) => done(job) && finish(job))
        .catch(() => undefined);
    const poll = setInterval(check, 1000);
    const timer = setTimeout(() => finish(null), ms);
    void check();
  });
}

/**
 * Send printer commands through the agent: ESC/POS bytes to the receipt printer, or
 * (target "label") the label printer's own commands, passed on as they are.
 * `commandId` is the idempotency key: the agent prints one key once.
 *  - printed: paper came out;
 *  - failed: nothing was printed (refused, agent gone, printer error, or the job was
 *    cancelled after waiting): safe to print another way;
 *  - unknown: the agent has the job and it could neither be confirmed nor cancelled.
 */
export async function agentPrint(
  bytes: Uint8Array,
  options: { commandId: string; target?: AgentTarget },
  deps: AgentDeps = defaultAgentDeps,
  waitMs = PRINT_WAIT_MS
): Promise<BridgeResult> {
  const sdk = await sdkFor(deps);
  if (!sdk) return { status: 'failed', error: 'JodaPrint is not set up' };
  const target = options.target ?? 'receipt';
  const settings = getAgentSettings();
  const printerId = agentPrinterLabel(settings, target);
  let jobId: string;
  try {
    const stored = await sdk.print({
      type: target === 'label' ? 'raw' : 'escpos',
      data: toBase64(bytes),
      printer: refOf(settings, target) as PrinterRef,
      idempotencyKey: options.commandId,
    });
    jobId = stored.jobId;
  } catch (error) {
    // Timed out: the agent may have stored the job. Anything else: it never got in.
    availableCache = null;
    return { status: codeOf(error) === 'TIMEOUT' ? 'unknown' : 'failed', error: messageOf(error), printerId };
  }
  const job = await waitForJob(sdk, jobId, waitMs);
  if (job?.state === 'printed') return { status: 'printed', error: null, printerId };
  if (job) return { status: 'failed', error: job.errorMessage ?? job.errorCode ?? job.state, printerId };
  // Still queued (printer off, no paper...): take it back so it can't print later as a
  // second original, then let the till print another way
  try {
    await sdk.jobs.cancel(jobId);
    const after = await sdk.jobs.get(jobId);
    if (after.state === 'cancelled' || after.state === 'failed') {
      return { status: 'failed', error: after.errorMessage ?? 'The printer did not answer in time', printerId };
    }
    if (after.state === 'printed') return { status: 'printed', error: null, printerId };
  } catch {
    /* could not cancel: uncertain */
  }
  return { status: 'unknown', error: 'The printer did not confirm the receipt', printerId };
}

/**
 * Open the cash drawer once through the agent (pulse on the receipt printer's drawer
 * port). Never retried here: a failed opening is reported to the cashier.
 */
export async function agentKick(options: { pin?: 2 | 5 } = {}, deps: AgentDeps = defaultAgentDeps): Promise<BridgeResult> {
  const sdk = await sdkFor(deps);
  if (!sdk) return { status: 'failed', error: 'JodaPrint is not set up' };
  try {
    await sdk.drawer.open(getAgentSettings().printer as PrinterRef, options.pin);
    return { status: 'printed', error: null };
  } catch (error) {
    return { status: codeOf(error) === 'TIMEOUT' ? 'unknown' : 'failed', error: messageOf(error) };
  }
}
