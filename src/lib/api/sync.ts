import apiClient from './client';
import type { CatalogItem, PosContext } from './sales';

export interface SyncCustomer {
  id: string;
  code: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  loyaltyPoints: number;
}

export interface SyncChanges {
  cursor: string;
  // Another page is waiting
  hasMore: boolean;
  // Download everything, then continue from `cursor`
  reset: boolean;
  resetReason: string | null;
  serverTime: string;
  items: CatalogItem[];
  removedVariantIds: string[];
  customers: SyncCustomer[];
  removedCustomerIds: string[];
  context: PosContext | null;
}

// ---- Push (spec §19) ----

// Typed envelope of one operation recorded on the till
export interface SyncOperation {
  deviceOperationId: string;
  deviceSequence: number;
  type: 'sale.create';
  schemaVersion: number;
  payloadHash: string;
  payload: Record<string, unknown>;
  lease?: string;
  actorId?: string;
  capturedAt?: string;
  dependsOn?: string[];
  snapshot?: Record<string, unknown>;
}

export type SyncAckStatus = 'accepted' | 'already_applied' | 'pending_dependency' | 'needs_review';

export interface SyncAck {
  deviceOperationId: string;
  deviceSequence: number;
  status: SyncAckStatus;
  saleId?: string;
  saleNumber?: string;
  reason?: string | null;
  // Accepted, but outside the till's offline lease: a review case was opened
  leaseIssues?: string[];
  conflictCaseId?: string | null;
}

export interface SyncPushResult {
  serverTime: string;
  results: SyncAck[];
}

// Operations per push (the server accepts up to 100)
export const PUSH_BATCH_SIZE = 50;

export const syncApi = {
  changes: async (params: { cursor?: string; registerId?: string; limit?: number }): Promise<SyncChanges> => {
    const { data } = await apiClient.get('/sync/changes', { params });
    return data;
  },
  push: async (input: { deviceId?: string; operations: SyncOperation[] }): Promise<SyncPushResult> => {
    const { data } = await apiClient.post('/sync/push', input);
    return data;
  },
  // Back office: upload the export file of a dead till
  import: async (input: { deviceId: string; operations: SyncOperation[] }): Promise<SyncPushResult> => {
    const { data } = await apiClient.post('/sync/import', input);
    return data;
  },
  // Manager approval to export unsynced sales to a file (wrap with useApproval)
  exportApproval: async (
    input: { deviceId?: string; operations?: number },
    headers?: Record<string, string>
  ): Promise<{ approved: boolean; approvedBy: string }> => {
    const { data } = await apiClient.post('/sync/export-approval', input, { headers });
    return data;
  },
};

// Why an offline sale falls outside its lease (offline_lease review cases)
export const LEASE_ISSUE_LABELS: Record<string, string> = {
  lease_missing: 'No offline lease was sent with the sale',
  lease_invalid: 'The offline lease is not valid (altered or unknown)',
  lease_wrong_tenant: 'The offline lease belongs to another store',
  lease_wrong_device: 'The offline lease belongs to another till',
  lease_wrong_branch: 'The offline lease is for another branch',
  lease_wrong_user: 'The offline lease was issued to another cashier',
  captured_before_lease: 'Sale time is before the lease was issued (clock set back?)',
  captured_after_lease: 'Sale made after the offline lease expired',
  captured_in_future: 'Sale time is later than the server time (clock set ahead?)',
  over_sale_amount: 'Above the offline limit per sale',
  over_sales_count: 'Beyond the number of offline sales allowed',
  over_total: 'Beyond the offline sales total allowed',
  permission_not_in_lease: 'The cashier was not allowed to do this offline',
};
