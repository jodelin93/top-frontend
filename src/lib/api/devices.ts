import apiClient from './client';
import type { LeaseClaims } from '@/lib/pos/offline-guard';

export type DeviceStatus = 'revoked' | 'gap' | 'stale_pending' | 'failed' | 'pending' | 'stale' | 'ok';

export interface DeviceHealth {
  status: DeviceStatus;
  expectedSequence: number;
  missingCount: number;
  unaccountedCount: number;
  stale: boolean;
  leaseActive: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  registerId: string | null;
  userAgent: string | null;
  appVersion: string | null;
  registeredAt: string;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  pendingSales: number;
  failedSales: number;
  lastSequence: number;
  leaseExpiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  // Marked lost: revoked for good, every further sync refused
  lostAt?: string | null;
  lostUnsyncedCount?: number | null;
  receivedCount: number;
  maxReceivedSequence: number | null;
  lastSaleAt: string | null;
  health: DeviceHealth;
  // Sync dashboard (spec §19)
  leaseIssuedAt: string | null;
  oldestPendingAt: string | null;
  pendingAmount: number;
  syncRetries: number;
  openConflicts: number;
  needsReviewOps: number;
}

export interface DeviceDetail extends Device {
  missingSequences: number[];
}

export interface DeviceBrief {
  id: string;
  name: string;
  status: DeviceStatus;
  pendingSales: number;
  failedSales: number;
  unaccountedSales: number;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  oldestPendingAt?: string | null;
  pendingAmount?: number;
  syncRetries?: number;
  openConflicts?: number;
  leaseExpiresAt?: string | null;
}

// GET /devices/summary: data freshness for dashboards
export interface DeviceSummary {
  generatedAt: string;
  staleMinutes: number;
  devices: { total: number; active: number };
  pendingSalesTotal: number;
  failedSalesTotal: number;
  pendingAmountTotal?: number;
  oldestPendingAt?: string | null;
  openConflictsTotal?: number;
  devicesWithPendingSales: DeviceBrief[];
  devicesNotSeenRecently: DeviceBrief[];
  devicesWithGaps: DeviceBrief[];
  lastSaleAt: string | null;
  lastDeviceSyncAt: string | null;
  dataComplete: boolean;
}

export interface LeaseResponse {
  id: string;
  leaseExpiresAt: string;
  offlineLeaseHours: number;
  leaseValid: boolean;
  // Signed offline lease and its claims (limits, window)
  lease: string;
  leaseClaims: LeaseClaims;
  leaseIssuedAt: string;
  serverTime: string;
}

export interface HeartbeatResponse {
  id: string;
  revokedAt: string | null;
  leaseExpiresAt: string | null;
  // Fresh signed lease (null for a revoked till)
  lease?: string | null;
  leaseClaims?: LeaseClaims | null;
  serverTime: string;
}

export interface HeartbeatInput {
  pendingSales: number;
  failedSales?: number;
  lastSequence?: number;
  registerId?: string;
  lastSyncAt?: string;
  appVersion?: string;
  // Sync queue details for the dashboard
  oldestPendingAt?: string;
  pendingAmount?: number;
  syncRetries?: number;
}

export const devicesApi = {
  // ---- POS ----
  register: async (input: {
    deviceId?: string;
    name?: string;
    registerId?: string;
    appVersion?: string;
  }): Promise<Device> => {
    const { data } = await apiClient.post('/devices/register', input);
    return data;
  },
  heartbeat: async (id: string, input: HeartbeatInput): Promise<HeartbeatResponse> => {
    const { data } = await apiClient.post(`/devices/${id}/heartbeat`, input);
    return data;
  },
  lease: async (id: string, registerId?: string | null): Promise<LeaseResponse> => {
    const { data } = await apiClient.post(`/devices/${id}/lease`, { registerId: registerId ?? undefined });
    return data;
  },
  // ---- Back office ----
  list: async (staleMinutes?: number): Promise<Device[]> => {
    const { data } = await apiClient.get('/devices', { params: { staleMinutes } });
    return data;
  },
  get: async (id: string): Promise<DeviceDetail> => {
    const { data } = await apiClient.get(`/devices/${id}`);
    return data;
  },
  summary: async (staleMinutes?: number): Promise<DeviceSummary> => {
    const { data } = await apiClient.get('/devices/summary', { params: { staleMinutes } });
    return data;
  },
  update: async (id: string, input: { name?: string; registerId?: string | null }): Promise<DeviceDetail> => {
    const { data } = await apiClient.patch(`/devices/${id}`, input);
    return data;
  },
  revoke: async (id: string, reason?: string): Promise<DeviceDetail> => {
    const { data } = await apiClient.post(`/devices/${id}/revoke`, { reason });
    return data;
  },
  /** Lost / abandoned till: revoke for good and open a review case */
  markLost: async (id: string, reason?: string): Promise<DeviceDetail> => {
    const { data } = await apiClient.post(`/devices/${id}/mark-lost`, { reason });
    return data;
  },
  restore: async (id: string): Promise<DeviceDetail> => {
    const { data } = await apiClient.post(`/devices/${id}/restore`);
    return data;
  },
};
