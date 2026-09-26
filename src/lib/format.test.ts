import { describe, expect, it } from 'vitest';
import { parseDateValue } from './format';

describe('parseDateValue', () => {
  it('reads a date-only value as that calendar day in local time', () => {
    const date = parseDateValue('2026-09-25');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 25]);
  });

  it('keeps full timestamps as instants', () => {
    expect(parseDateValue('2026-09-25T12:00:00Z').toISOString()).toBe('2026-09-25T12:00:00.000Z');
  });
});
