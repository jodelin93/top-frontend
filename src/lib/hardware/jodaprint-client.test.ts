import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@jodaprint/sdk';
import {
  agentConnection,
  agentKick,
  agentPrint,
  agentPrinterLabel,
  isAgentAvailable,
  isAgentLabelPrinterAvailable,
  resetAgent,
  saveAgentSettings,
  type AgentDeps,
  type AgentSdk,
} from './jodaprint-client';

const job = (state: Job['state'], extra: Partial<Job> = {}): Job =>
  ({ id: 'job_1', printerId: 'prn_1', source: 'local', type: 'escpos', state, attempt: 1, createdAt: '', updatedAt: '', ...extra }) as Job;

function fakeAgent(overrides: Partial<Record<'connect' | 'print' | 'get' | 'cancel' | 'open', ReturnType<typeof vi.fn>>> = {}) {
  const sdk = {
    connect: overrides.connect ?? vi.fn().mockResolvedValue({ version: '1.0.1', orgId: 'org_1' }),
    print: overrides.print ?? vi.fn().mockResolvedValue({ jobId: 'job_1', state: 'queued' }),
    on: vi.fn().mockReturnValue(() => undefined),
    isConnected: vi.fn().mockReturnValue(true),
    disconnect: vi.fn(),
    printers: { list: vi.fn().mockResolvedValue([]) },
    jobs: {
      get: overrides.get ?? vi.fn().mockResolvedValue(job('printed')),
      cancel: overrides.cancel ?? vi.fn().mockResolvedValue({ jobId: 'job_1', state: 'cancelled' }),
    },
    drawer: { open: overrides.open ?? vi.fn().mockResolvedValue({ ok: true }) },
  };
  const deps: AgentDeps = {
    config: vi.fn().mockResolvedValue({ enabled: true, orgId: 'org_1' }),
    create: vi.fn().mockReturnValue(sdk as unknown as AgentSdk),
    online: () => true,
  };
  return { sdk, deps };
}

const bytes = new Uint8Array([0x1b, 0x40]);

afterEach(() => {
  resetAgent();
  localStorage.clear();
});

describe('JodaPrint agent client', () => {
  it('is available when the server signs and an activated agent answers', async () => {
    const { deps } = fakeAgent();
    expect(await isAgentAvailable(deps, true)).toBe(true);
    expect(deps.create).toHaveBeenCalledWith('org_1');
  });

  it('is not available offline, when not set up, or without an activated agent', async () => {
    const offline = fakeAgent();
    expect(await isAgentAvailable({ ...offline.deps, online: () => false }, true)).toBe(false);
    expect(offline.sdk.connect).not.toHaveBeenCalled();

    const off = fakeAgent();
    off.deps.config = vi.fn().mockResolvedValue({ enabled: false, orgId: null });
    expect(await isAgentAvailable(off.deps, true)).toBe(false);
    resetAgent();

    const inactive = fakeAgent({ connect: vi.fn().mockResolvedValue({ version: '1.0.1', orgId: null }) });
    expect(await isAgentAvailable(inactive.deps, true)).toBe(false);
  });

  it('says why the agent refused (address not allowed)', async () => {
    const { deps } = fakeAgent({ connect: vi.fn().mockRejectedValue(Object.assign(new Error('not allowed'), { code: 'ORIGIN_NOT_ALLOWED' })) });
    expect(await agentConnection(deps)).toEqual({ info: null, problem: { code: 'ORIGIN_NOT_ALLOWED', message: 'not allowed' } });
  });

  it('prints raw ESC/POS on the "receipt" printer with the job id as idempotency key', async () => {
    const { sdk, deps } = fakeAgent();
    const result = await agentPrint(bytes, { commandId: 'print-job-7' }, deps);
    expect(result).toEqual({ status: 'printed', error: null, printerId: 'jodaprint:receipt' });
    expect(sdk.print).toHaveBeenCalledWith({
      type: 'escpos',
      data: 'G0A=',
      printer: { alias: 'receipt' },
      idempotencyKey: 'print-job-7',
    });
  });

  it('sends label commands as they are to the "label" printer', async () => {
    const { sdk, deps } = fakeAgent();
    const result = await agentPrint(bytes, { commandId: 'labels-1', target: 'label' }, deps);
    expect(result).toEqual({ status: 'printed', error: null, printerId: 'jodaprint:label' });
    expect(sdk.print).toHaveBeenCalledWith({
      type: 'raw',
      data: 'G0A=',
      printer: { alias: 'label' },
      idempotencyKey: 'labels-1',
    });
  });

  it('knows whether this till has its label printer', async () => {
    const { sdk, deps } = fakeAgent();
    expect(await isAgentLabelPrinterAvailable(deps)).toBe(false);
    sdk.printers.list.mockResolvedValue([
      { id: 'prn_1', name: 'POS80', alias: 'receipt', kind: 'thermal' },
      { id: 'prn_2', name: 'Westinghouse', alias: 'label', kind: 'document' },
    ]);
    expect(await isAgentLabelPrinterAvailable(deps)).toBe(true);
    saveAgentSettings({ labelPrinter: { id: 'prn_7' } });
    expect(await isAgentLabelPrinterAvailable(deps)).toBe(false);
    expect(agentPrinterLabel(undefined, 'label')).toBe('jodaprint:prn_7');
  });

  it('uses the printer chosen on this till', async () => {
    const { sdk, deps } = fakeAgent();
    saveAgentSettings({ printer: { id: 'prn_9' }, widthMm: 58 });
    await agentPrint(bytes, { commandId: 'a' }, deps);
    expect(sdk.print.mock.calls[0][0].printer).toEqual({ id: 'prn_9' });
    expect(agentPrinterLabel()).toBe('jodaprint:prn_9');
  });

  it('reports a job the printer failed as failed (nothing printed)', async () => {
    const { deps } = fakeAgent({ get: vi.fn().mockResolvedValue(job('failed', { errorCode: 'PAPER_OUT', errorMessage: 'Paper out' })) });
    expect(await agentPrint(bytes, { commandId: 'a' }, deps)).toMatchObject({ status: 'failed', error: 'Paper out' });
  });

  it('reports failed when the agent never took the job, unknown when it timed out', async () => {
    const refused = fakeAgent({ print: vi.fn().mockRejectedValue(Object.assign(new Error('refused'), { code: 'ORIGIN_NOT_ALLOWED' })) });
    expect(await agentPrint(bytes, { commandId: 'a' }, refused.deps)).toMatchObject({ status: 'failed', error: 'refused' });
    resetAgent();
    const slow = fakeAgent({ print: vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })) });
    expect(await agentPrint(bytes, { commandId: 'b' }, slow.deps)).toMatchObject({ status: 'unknown' });
  });

  it('takes back a job still waiting for the printer, so it cannot print later', async () => {
    const get = vi.fn().mockResolvedValueOnce(job('queued')).mockResolvedValue(job('cancelled'));
    const { sdk, deps } = fakeAgent({ get });
    const result = await agentPrint(bytes, { commandId: 'a' }, deps, 20);
    expect(sdk.jobs.cancel).toHaveBeenCalledWith('job_1');
    expect(result.status).toBe('failed');
  });

  it('is uncertain when a waiting job can be neither confirmed nor cancelled', async () => {
    const { deps } = fakeAgent({ get: vi.fn().mockResolvedValue(job('sending')), cancel: vi.fn().mockRejectedValue(new Error('too late')) });
    expect((await agentPrint(bytes, { commandId: 'a' }, deps, 20)).status).toBe('unknown');
  });

  it('opens the drawer once on the receipt printer and never retries', async () => {
    const ok = fakeAgent();
    expect(await agentKick({ pin: 5 }, ok.deps)).toEqual({ status: 'printed', error: null });
    expect(ok.sdk.drawer.open).toHaveBeenCalledTimes(1);
    expect(ok.sdk.drawer.open).toHaveBeenCalledWith({ alias: 'receipt' }, 5);
    resetAgent();
    const bad = fakeAgent({ open: vi.fn().mockRejectedValue(new Error('printer offline')) });
    expect(await agentKick({}, bad.deps)).toEqual({ status: 'failed', error: 'printer offline' });
    expect(bad.sdk.drawer.open).toHaveBeenCalledTimes(1);
  });
});
