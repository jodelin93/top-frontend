import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bridgeSignature, getPairing, pairBridge } from './bridge-client';
import { kickDrawer } from './drawer-kick';

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('print bridge client', () => {
  it('signs exactly like the bridge verifies (print-bridge/src/auth.js)', async () => {
    const body = JSON.stringify({ commandId: 'abc12345' });
    const canonical = `1800000000000\nPOST\n/drawer\n${createHash('sha256').update(body).digest('hex')}`;
    const expected = createHmac('sha256', Buffer.from('s3cret', 'utf8')).update(canonical).digest('hex');
    expect(await bridgeSignature('s3cret', '1800000000000', 'post', '/drawer', body)).toBe(expected);
  });

  it('pairs with a code and keeps the secret and first printer for this browser', async () => {
    const fetchMock = vi.fn(() => json(200, { secret: 'sec', origin: 'http://localhost:3001', printers: [{ id: 'front', name: 'Front', connection: 'tcp', widthMm: 58 }] }));
    vi.stubGlobal('fetch', fetchMock);
    await pairBridge('123 456');
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown[])[1] && ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body))).toEqual({ code: '123456' });
    expect(getPairing()).toMatchObject({ secret: 'sec', printerId: 'front', widthMm: 58 });
  });

  it('opens the drawer with one signed command and never retries it', async () => {
    localStorage.setItem('pos_print_bridge', JSON.stringify({ url: 'http://127.0.0.1:17777', secret: 'sec', origin: 'x', printerId: null, widthMm: 80, pairedAt: '' }));
    const fetchMock = vi.fn(() => json(409, { error: 'replayed' }));
    vi.stubGlobal('fetch', fetchMock);
    const outcome = await kickDrawer({ commandId: 'drawer-000001' });
    expect(outcome).toMatchObject({ opened: false, status: 'replayed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers['X-Bridge-Signature']).toMatch(/^[0-9a-f]{64}$/);

    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await kickDrawer()).toMatchObject({ opened: false, status: 'failed' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports no bridge when this browser is not paired', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await kickDrawer()).toEqual({ opened: false, status: 'no_bridge', error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
