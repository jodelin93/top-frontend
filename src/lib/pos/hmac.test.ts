import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hmacSha256Hex, sha256Hex } from './payload-hash';

describe('built-in HMAC-SHA256 (no Web Crypto)', () => {
  it('matches Node for short and long keys', () => {
    const message = '1695600000\nPOST\n/print\n' + sha256Hex('{"a":1}');
    for (const key of ['bridge-secret', 'k'.repeat(100)]) {
      expect(hmacSha256Hex(key, message)).toBe(createHmac('sha256', key).update(message).digest('hex'));
    }
  });
});
