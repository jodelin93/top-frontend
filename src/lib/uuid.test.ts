import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomId } from './uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses crypto.randomUUID when the page is a secure context', () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it('still works on a plain-http LAN address (no crypto.randomUUID)', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
    const ids = new Set([randomId(), randomId(), randomId()]);
    expect(ids.size).toBe(3);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
