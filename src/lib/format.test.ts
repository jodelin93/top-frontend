import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDaysLocalIso, localIsoDate, nowLocalInput, parseDateValue, todayLocalIso } from './format';

describe('parseDateValue', () => {
  it('reads a date-only value as that calendar day in local time', () => {
    const date = parseDateValue('2026-09-25');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 25]);
  });

  it('keeps full timestamps as instants', () => {
    expect(parseDateValue('2026-09-25T12:00:00Z').toISOString()).toBe('2026-09-25T12:00:00.000Z');
  });
});

describe('local calendar dates', () => {
  afterEach(() => vi.useRealTimers());

  it('uses the device day, not the UTC day, in the evening in Haiti', () => {
    // 21:30 local on 9 March (02:30 UTC on the 10th in UTC−5)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 9, 21, 30));
    expect(todayLocalIso()).toBe('2026-03-09');
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(nowLocalInput()).toBe('2026-03-09T21:30');
  });

  it('adds days on the local calendar', () => {
    const from = new Date(2026, 1, 28, 23, 0);
    expect(addDaysLocalIso(1, from)).toBe('2026-03-01');
    expect(addDaysLocalIso(0, from)).toBe('2026-02-28');
    expect(addDaysLocalIso(366, new Date(2026, 8, 27))).toBe('2027-09-28');
  });
});
