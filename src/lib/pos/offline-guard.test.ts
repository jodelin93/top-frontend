import { describe, expect, it } from 'vitest';
import {
  assessClock,
  checkOfflineLimits,
  CLOCK_TOLERANCE_MS,
  decodeLeaseToken,
  initialClock,
  RETRY_BASE_MS,
  RETRY_CAP_MS,
  retryDelayMs,
  revalidateClock,
} from './offline-guard';

const T0 = Date.parse('2026-09-24T12:00:00Z');

describe('clock rollback detection', () => {
  it('moves the watermark forward and bumps the monotonic counter', () => {
    const first = assessClock(initialClock(), T0, null);
    expect(first.problem).toBeNull();
    const second = assessClock(first.next, T0 + 60_000, null);
    expect(second.problem).toBeNull();
    expect(second.next).toMatchObject({ lastLocalTime: T0 + 60_000, counter: 2 });
  });

  it('blocks when the clock goes backwards beyond the tolerance, and stays blocked', () => {
    const state = assessClock(initialClock(), T0, null).next;
    expect(assessClock(state, T0 - 60_000, null).problem).toBeNull(); // small drift
    const rolled = assessClock(state, T0 - CLOCK_TOLERANCE_MS - 1, null);
    expect(rolled.problem).toBe('clock_rollback');
    // Even with the right time again, only an online revalidation lifts it
    expect(assessClock(rolled.next, T0 + 1000, null).problem).toBe('clock_rollback');
    const fixed = revalidateClock(rolled.next, T0 + 2000, T0 + 2000);
    expect(assessClock(fixed, T0 + 3000, null).problem).toBeNull();
    expect(fixed.counter).toBeGreaterThan(rolled.next.counter);
  });

  it('blocks a time earlier than the last server time or than the lease issue', () => {
    const synced = revalidateClock(null, T0, T0);
    expect(assessClock({ ...synced, lastLocalTime: 0 }, T0 - CLOCK_TOLERANCE_MS - 1, null).problem).toBe(
      'clock_rollback'
    );
    expect(assessClock(initialClock(), T0 - CLOCK_TOLERANCE_MS - 1, { iat: T0 }).problem).toBe('clock_before_lease');
  });

  it('a fast-forwarded clock sets the watermark: going back after it is caught', () => {
    const jumped = assessClock(initialClock(), T0 + 30 * 24 * 3600_000, null).next;
    expect(assessClock(jumped, T0, null).problem).toBe('clock_rollback');
  });
});

describe('offline limits', () => {
  const limits = { maxSaleAmount: 100, maxSales: 2, maxTotal: 150 };
  it('refuses sales beyond the lease limits', () => {
    expect(checkOfflineLimits(limits, { count: 0, total: 0 }, 100)).toBeNull();
    expect(checkOfflineLimits(limits, { count: 0, total: 0 }, 100.01)).toBe('over_sale_amount');
    expect(checkOfflineLimits(limits, { count: 2, total: 20 }, 10)).toBe('over_sales_count');
    expect(checkOfflineLimits(limits, { count: 1, total: 100 }, 50.01)).toBe('over_total');
    expect(checkOfflineLimits({ maxSaleAmount: 0, maxSales: 0, maxTotal: 0 }, { count: 1e6, total: 1e9 }, 1e6)).toBeNull();
    expect(checkOfflineLimits(null, { count: 0, total: 0 }, 1e9)).toBeNull();
  });
});

describe('retry backoff', () => {
  it('doubles each attempt, with jitter between half and all of the step, up to the cap', () => {
    expect(retryDelayMs(0, () => 0)).toBe(RETRY_BASE_MS / 2);
    expect(retryDelayMs(0, () => 1)).toBe(RETRY_BASE_MS);
    expect(retryDelayMs(3, () => 1)).toBe(RETRY_BASE_MS * 8);
    expect(retryDelayMs(3, () => 0.5)).toBe(RETRY_BASE_MS * 6);
    expect(retryDelayMs(50, () => 1)).toBe(RETRY_CAP_MS);
    expect(retryDelayMs(50, () => 0)).toBe(RETRY_CAP_MS / 2);
  });
});

describe('decodeLeaseToken', () => {
  it('reads the claims of a signed lease and rejects garbage', () => {
    const claims = { v: 1, jti: 'l1', tid: 't', bid: null, rid: null, did: 'd', uid: 'u', perms: ['pos.sell'], lim: { maxSaleAmount: 0, maxSales: 5, maxTotal: 0 }, iat: 1, exp: 2 };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    expect(decodeLeaseToken(`${payload}.signature`)).toEqual(claims);
    expect(decodeLeaseToken('%%%.x')).toBeNull();
    expect(decodeLeaseToken(null)).toBeNull();
  });
});
