import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrintJob } from './documents-api';
import { printDocument, retryPrint, type PrintDeps, type PrintRequest } from './print-manager';

let seq = 0;
const job = (overrides: Partial<PrintJob> = {}): PrintJob => ({
  id: overrides.id ?? `job-${++seq}`,
  documentType: 'receipt',
  documentId: 'sale-1',
  documentNumber: 'S-1',
  copy: false,
  copyNumber: null,
  deviceId: null,
  printerId: null,
  channel: 'bridge',
  status: 'queued',
  error: null,
  retryOfId: null,
  userId: 'u1',
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

function setup(options: { bridge?: boolean; bridgeStatus?: 'printed' | 'failed' | 'unknown' } = {}) {
  const kick = vi.fn();
  const deps = {
    api: {
      createPrintJob: vi.fn(async (input: { copy?: boolean; channel?: string }) =>
        job({ copy: !!input.copy, copyNumber: input.copy ? 1 : null, channel: input.channel as PrintJob['channel'] })
      ),
      updatePrintJob: vi.fn(async (id: string) => job({ id })),
      retryPrintJob: vi.fn(async (id: string) => job({ copy: true, copyNumber: 1, retryOfId: id })),
    },
    bridge: {
      available: vi.fn(async () => options.bridge ?? true),
      print: vi.fn(async () => ({ status: options.bridgeStatus ?? 'printed', error: (options.bridgeStatus ?? 'printed') === 'printed' ? null : 'boom' })),
      // Must never be called by printing or retrying
      kick,
    },
  } satisfies PrintDeps & { bridge: { kick: unknown } };
  const escpos = vi.fn((copyNumber: number | null) => Uint8Array.from([copyNumber ?? 0]));
  const browserPrint = vi.fn();
  const request: PrintRequest = { documentType: 'receipt', documentId: 'sale-1', copy: false, escpos, browserPrint };
  return { deps, kick, escpos, browserPrint, request };
}

beforeEach(() => {
  seq = 0;
});

describe('printing a document', () => {
  it('records the job, prints through the bridge with the job id, and reports it', async () => {
    const { deps, request, browserPrint } = setup();
    const outcome = await printDocument(request, deps);
    expect(deps.api.createPrintJob).toHaveBeenCalledWith(expect.objectContaining({ copy: false, channel: 'bridge' }));
    expect(deps.bridge.print).toHaveBeenCalledWith(expect.any(Uint8Array), expect.objectContaining({ commandId: 'job-1' }));
    expect(deps.api.updatePrintJob).toHaveBeenCalledWith('job-1', 'printed', null);
    expect(outcome).toMatchObject({ status: 'printed', channel: 'bridge', copyNumber: null });
    expect(browserPrint).not.toHaveBeenCalled();
  });

  it('prints the copy number the server gave', async () => {
    const { deps, request, escpos } = setup();
    deps.api.createPrintJob.mockResolvedValueOnce(job({ copy: true, copyNumber: 3 }));
    const outcome = await printDocument(request, deps);
    expect(escpos).toHaveBeenCalledWith(3);
    expect(outcome.copyNumber).toBe(3);
  });

  it('falls back to the print dialog when the bridge printed nothing, keeping the original', async () => {
    const { deps, request, browserPrint } = setup({ bridgeStatus: 'failed' });
    const outcome = await printDocument(request, deps);
    expect(deps.api.updatePrintJob).toHaveBeenCalledWith('job-1', 'failed', 'boom');
    expect(deps.api.createPrintJob).toHaveBeenLastCalledWith(expect.objectContaining({ copy: false, channel: 'browser' }));
    expect(browserPrint).toHaveBeenCalledWith(null);
    expect(deps.api.updatePrintJob).toHaveBeenLastCalledWith('job-2', 'sent');
    expect(outcome).toMatchObject({ status: 'sent', channel: 'browser' });
  });

  it('leaves an uncertain print as unknown (no automatic reprint)', async () => {
    const { deps, request, browserPrint } = setup({ bridgeStatus: 'unknown' });
    const outcome = await printDocument(request, deps);
    expect(outcome.status).toBe('unknown');
    expect(deps.bridge.print).toHaveBeenCalledTimes(1);
    expect(browserPrint).not.toHaveBeenCalled();
  });

  it('retries an uncertain print as a COPY and never kicks the drawer', async () => {
    const { deps, request, kick, escpos } = setup({ bridgeStatus: 'unknown' });
    const first = await printDocument(request, deps);
    deps.bridge.print.mockResolvedValueOnce({ status: 'printed', error: null });
    const retried = await retryPrint(first.job!, request, deps);
    expect(deps.api.retryPrintJob).toHaveBeenCalledWith('job-1');
    expect(escpos).toHaveBeenLastCalledWith(1);
    expect(retried).toMatchObject({ copyNumber: 1, status: 'printed' });
    // A new command id: the bridge does not treat it as the first print
    expect((deps.bridge.print.mock.calls[1] as unknown[])[1]).toMatchObject({ commandId: retried.job!.id });
    expect(retried.job!.id).not.toBe(first.job!.id);
    expect(kick).not.toHaveBeenCalled();
  });

  it('uses the print dialog without a bridge, and only it for A4 documents', async () => {
    const { deps, request, browserPrint } = setup({ bridge: false });
    await printDocument(request, deps);
    expect(deps.bridge.print).not.toHaveBeenCalled();
    expect(browserPrint).toHaveBeenCalled();
    const a4 = setup();
    await printDocument({ ...a4.request, documentType: 'invoice', escpos: null }, a4.deps);
    expect(a4.deps.bridge.print).not.toHaveBeenCalled();
    expect(a4.deps.api.createPrintJob).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'invoice', channel: 'browser' }));
  });

  it('prints offline sales locally without a print job', async () => {
    const { deps, request } = setup();
    const outcome = await printDocument({ ...request, documentId: null, copy: true, localCopyNumber: 2 }, deps);
    expect(deps.api.createPrintJob).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ job: null, copyNumber: 2 });
  });

  it('refuses a copy the user may not print (server says 403)', async () => {
    const { deps, request, browserPrint } = setup();
    deps.api.createPrintJob.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403 } }));
    await expect(printDocument(request, deps)).rejects.toThrow('Forbidden');
    expect(browserPrint).not.toHaveBeenCalled();
  });
});
