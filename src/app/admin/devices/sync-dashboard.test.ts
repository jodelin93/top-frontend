import { describe, expect, it } from 'vitest';
import type { Device } from '@/lib/api/devices';
import { ageOf, filterDevices } from './sync-dashboard';

const NOW = Date.parse('2026-09-24T12:00:00Z');

const device = (id: string, extra: Partial<Device> = {}): Device =>
  ({
    id,
    name: `Till ${id}`,
    pendingSales: 0,
    failedSales: 0,
    needsReviewOps: 0,
    openConflicts: 0,
    pendingAmount: 0,
    syncRetries: 0,
    oldestPendingAt: null,
    revokedAt: null,
    leaseExpiresAt: '2026-09-25T00:00:00Z',
    ...extra,
  }) as Device;

describe('sync dashboard filters', () => {
  const devices = [
    device('a'),
    device('b', { pendingSales: 3, pendingAmount: 45 }),
    device('c', { failedSales: 1 }),
    device('d', { needsReviewOps: 2 }),
    device('e', { openConflicts: 1 }),
    device('f', { leaseExpiresAt: '2026-09-24T11:00:00Z' }),
    device('g', { revokedAt: '2026-09-20T00:00:00Z', leaseExpiresAt: null }),
  ];
  const ids = (list: Device[]) => list.map((d) => d.id);

  it('filters by queue, review, conflicts and lease', () => {
    expect(ids(filterDevices(devices, 'all', '', NOW))).toHaveLength(7);
    expect(ids(filterDevices(devices, 'pending', '', NOW))).toEqual(['b']);
    expect(ids(filterDevices(devices, 'review', '', NOW))).toEqual(['c', 'd']);
    expect(ids(filterDevices(devices, 'conflicts', '', NOW))).toEqual(['e']);
    // A revoked till is not "lease expired"
    expect(ids(filterDevices(devices, 'lease', '', NOW))).toEqual(['f']);
  });

  it('searches by name', () => {
    expect(ids(filterDevices(devices, 'all', 'till B', NOW))).toEqual(['b']);
  });

  it('shows the queue age', () => {
    expect(ageOf('2026-09-24T11:30:00Z', NOW)).toBe('30 min');
    expect(ageOf('2026-09-24T09:05:00Z', NOW)).toBe('2 h 55 min');
    expect(ageOf('2026-09-21T12:00:00Z', NOW)).toBe('3 days');
    expect(ageOf(null, NOW)).toBe('—');
  });
});
