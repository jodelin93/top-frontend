/**
 * Pure rules the till applies before selling offline (spec §19), unit tested in
 * offline-guard.test.ts:
 * - the signed lease from the server (claims readable here, signature checked by
 *   the server when the sales sync);
 * - clock rollback detection: the till remembers the last server time and the
 *   latest local time it has seen; a clock that goes backwards blocks offline
 *   selling until the till is back online;
 * - the lease's offline limits;
 * - the retry schedule of uploads (exponential backoff with jitter).
 */

export interface LeaseLimits {
  // 0 = no limit
  maxSaleAmount: number;
  maxSales: number;
  maxTotal: number;
}

export interface LeaseClaims {
  v: number;
  jti: string;
  tid: string;
  bid: string | null;
  rid: string | null;
  did: string;
  uid: string;
  perms: string[];
  lim: LeaseLimits;
  // epoch ms (server clock)
  iat: number;
  exp: number;
}

// Clock drift tolerated (same as the server)
export const CLOCK_TOLERANCE_MS = 5 * 60_000;

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

/** Claims of a lease token (not verified: only the server holds the secret). */
export function decodeLeaseToken(token: string | null | undefined): LeaseClaims | null {
  if (!token) return null;
  try {
    const claims = JSON.parse(fromBase64Url(token.split('.')[0])) as LeaseClaims;
    if (typeof claims?.jti !== 'string' || typeof claims.iat !== 'number' || typeof claims.exp !== 'number' || !claims.lim) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

// ---- Clock ----

export type ClockProblem = 'clock_rollback' | 'clock_before_lease';

export interface ClockState {
  // Last server time seen (epoch ms) and the local time it was seen at
  lastServerTime: number | null;
  lastServerSeenAt: number | null;
  // Latest local time seen so far (watermark)
  lastLocalTime: number;
  // Monotonic counter, bumped at every check (stored with each offline sale)
  counter: number;
  // Set once a problem is found; only an online revalidation clears it
  blocked: ClockProblem | null;
}

export const initialClock = (): ClockState => ({
  lastServerTime: null,
  lastServerSeenAt: null,
  lastLocalTime: 0,
  counter: 0,
  blocked: null,
});

/**
 * Check the local clock before an offline sale. Returns the problem (if any) and
 * the state to store: the watermark only moves forward, the counter always does.
 */
export function assessClock(
  state: ClockState | null | undefined,
  now: number,
  lease: Pick<LeaseClaims, 'iat'> | null
): { problem: ClockProblem | null; next: ClockState } {
  const current = state ?? initialClock();
  let problem: ClockProblem | null = current.blocked;
  if (!problem && current.lastLocalTime && now < current.lastLocalTime - CLOCK_TOLERANCE_MS) {
    problem = 'clock_rollback';
  }
  if (!problem && current.lastServerTime !== null && now < current.lastServerTime - CLOCK_TOLERANCE_MS) {
    // Earlier than a time the server already told us about
    problem = 'clock_rollback';
  }
  if (!problem && lease && now < lease.iat - CLOCK_TOLERANCE_MS) problem = 'clock_before_lease';
  return {
    problem,
    next: {
      ...current,
      lastLocalTime: Math.max(current.lastLocalTime, now),
      counter: current.counter + 1,
      blocked: problem,
    },
  };
}

/** Online again: the server's time resets the watermark and lifts a block. */
export function revalidateClock(state: ClockState | null | undefined, serverTime: number, now: number): ClockState {
  return {
    lastServerTime: serverTime,
    lastServerSeenAt: now,
    lastLocalTime: now,
    counter: (state?.counter ?? 0) + 1,
    blocked: null,
  };
}

// ---- Lease limits ----

export interface LeaseUsage {
  leaseId: string;
  count: number;
  total: number;
}

export type LimitProblem = 'over_sale_amount' | 'over_sales_count' | 'over_total';

/** Would this sale break the lease's offline limits? (usage = sales already made under it) */
export function checkOfflineLimits(
  limits: LeaseLimits | null | undefined,
  usage: Pick<LeaseUsage, 'count' | 'total'>,
  saleTotal: number
): LimitProblem | null {
  if (!limits) return null;
  if (limits.maxSaleAmount > 0 && saleTotal > limits.maxSaleAmount) return 'over_sale_amount';
  if (limits.maxSales > 0 && usage.count + 1 > limits.maxSales) return 'over_sales_count';
  if (limits.maxTotal > 0 && Math.round((usage.total + saleTotal) * 100) / 100 > limits.maxTotal) return 'over_total';
  return null;
}

// ---- Upload retries ----

export const RETRY_BASE_MS = 5_000;
export const RETRY_CAP_MS = 10 * 60_000;

/**
 * Wait before retry number `attempt` (0 = first retry): exponential, capped, with
 * "equal jitter" (between half and all of the step) so tills don't retry in step.
 */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  const step = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** Math.max(0, Math.min(attempt, 30)));
  return Math.round(step / 2 + random() * (step / 2));
}
