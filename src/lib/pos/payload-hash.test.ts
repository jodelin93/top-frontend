import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalJson, payloadHash, sha256Hex } from './payload-hash';

const nodeSha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('sha256Hex', () => {
  it('matches the standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches Node for multi-block and non-ASCII input', () => {
    for (const text of ['a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(1000), 'Café — 5 € · kreyòl 🇭🇹']) {
      expect(sha256Hex(text)).toBe(nodeSha(text));
    }
  });
});

describe('canonicalJson', () => {
  it('sorts keys at every level, drops undefined members and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: undefined, b: null } })).toBe('{"a":{"b":null,"d":[3,1]},"b":1}');
  });

  it('gives the same hash whatever the key order (same as the server)', () => {
    const one = { registerId: 'r', items: [{ variantId: 'v', quantity: 2 }], total: 10.5 };
    const two = { total: 10.5, items: [{ quantity: 2, variantId: 'v' }], registerId: 'r' };
    expect(payloadHash(one)).toBe(payloadHash(two));
    expect(payloadHash(one)).toBe(nodeSha('{"items":[{"quantity":2,"variantId":"v"}],"registerId":"r","total":10.5}'));
  });
});
