import apiClient, { withIdempotencyKey } from './client';
import { crudApi, type LocalizedText } from './crud';
import type { InventoryLocation, LocationStockStatus, TransferSettings } from './settings';

// Declared with the store settings types; re-exported for the inventory screens
export type { LocationStockStatus, TransferSettings } from './settings';

// Locations as the API returns them, with their stock status
export type StockLocation = InventoryLocation;

export type StockLocationInput = Partial<Omit<StockLocation, 'id' | 'stockStatus'>> & {
  stockStatus?: Exclude<LocationStockStatus, 'transit'>;
};

// Same /locations resource as locationsApi, typed with the stock status.
// Updating the transit location is refused (it is managed by the system).
export const stockLocationsApi = crudApi<StockLocation, StockLocationInput>('/locations');

export interface StockRow {
  variantId: string;
  sku: string;
  barcode: string | null;
  variantName: LocalizedText | null;
  productId: string;
  productName: LocalizedText;
  reorderPoint: number | null;
  locationId: string;
  locationCode: string;
  locationName: string | null;
  quantityOnHand: number;
  quantityAvailable: number;
  // Held for held carts / orders (on hand − reserved = available)
  quantityReserved: number;
  // Dispatched towards this location by a transfer, not received yet
  quantityInTransit: number;
  // Status of the location (only sellable stock can be sold)
  stockStatus?: LocationStockStatus;
  // Variant unit cost (moving average or latest purchase cost, see costing method);
  // left out without inventory.cost.view
  cost?: number | null;
  lastCountedAt: string | null;
  lastReceivedAt: string | null;
  // Unit of measure: measured items (kg, m, l) have decimal quantities shown with
  // the unit's precision (absent on older servers: by the piece)
  unitCode?: string | null;
  unitAllowsDecimals?: boolean;
  unitPrecision?: number;
}

/** Unit of a stock row, for formatQuantity() */
export const stockRowUnit = (row: Pick<StockRow, 'unitCode' | 'unitAllowsDecimals' | 'unitPrecision'>) =>
  row.unitAllowsDecimals
    ? { code: row.unitCode ?? null, allowsDecimals: true, precision: Number(row.unitPrecision ?? 0) }
    : null;

export type AdjustmentReason = 'recount' | 'damage' | 'theft' | 'expiry' | 'other';

export interface StockMovement {
  id: string;
  variantId: string;
  fromLocationId: string | null;
  toLocationId: string | null;
  movementType:
    | 'sale'
    | 'purchase'
    | 'adjustment'
    | 'transfer'
    | 'return'
    | 'damage'
    | 'theft'
    | 'recount'
    | 'revaluation';
  // 0 for a revaluation
  quantity: number;
  movementDate: string;
  referenceType: string | null;
  referenceNumber: string | null;
  // Left out without inventory.cost.view
  cost?: number | null;
  notes: string | null;
  sourceEventId?: string | null;
  correlationId?: string | null;
  // The movement this one reverses
  reversalOfId?: string | null;
  metadata?: (Record<string, unknown> & Partial<RevaluationMetadata>) | null;
  variant?: { id: string; sku: string; name: LocalizedText | null; product?: { name: LocalizedText } };
}

export interface RevaluationValuation {
  beforeCost: number | null;
  afterCost: number;
  valueBefore: number;
  valueAfter: number;
  valueChange: number;
}

// metadata of a revaluation movement; valuation is left out without inventory.cost.view
export interface RevaluationMetadata {
  kind: 'manual' | 'costing_method_change';
  quantity: number;
  valuation?: RevaluationValuation;
}

type Headers = Record<string, string>;

// ---- Stock counts ----

export type StockCountStatus = 'in_progress' | 'pending_approval' | 'posted' | 'cancelled';

export interface StockCountSummary {
  lines: number;
  counted: number;
  uncounted: number;
  withVariance: number;
  unitsOver: number;
  unitsShort: number;
  netUnits: number;
  netValue: number;
}

export interface StockCount {
  id: string;
  countNumber: string;
  locationId: string;
  location?: { id: string; code: string; name: string | null };
  categoryId: string | null;
  blind: boolean;
  status: StockCountStatus;
  notes: string | null;
  createdById: string;
  submittedById: string | null;
  submittedAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  cancelledAt: string | null;
  // When the expected quantities were captured
  snapshotAt?: string | null;
  createdAt: string;
  // List only
  lineCount?: number;
  countedCount?: number;
}

export interface StockCountLine {
  id: string;
  variantId: string;
  sku: string;
  barcode: string | null;
  variantName: LocalizedText | null;
  productName: LocalizedText;
  // On hand at the snapshot. Null while a blind count is in progress
  expectedQuantity: number | null;
  // Net movements at the location between the snapshot and when the line was
  // counted (sales, receipts...). Known once submitted; null while blind
  movementsSinceSnapshot?: number | null;
  // Roll-forward: expectedQuantity + movementsSinceSnapshot
  expectedAtCount?: number | null;
  countedQuantity: number | null;
  // counted − expected at count
  variance: number | null;
  // Why the line differs (optional)
  reason?: string | null;
  // Left out without inventory.cost.view
  unitCost?: number | null;
  countedAt: string | null;
}

export interface StockCountDetail extends StockCount {
  expectedHidden: boolean;
  items: StockCountLine[];
  summary: StockCountSummary | null;
}

// ---- Transfers ----

export type TransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'partially_dispatched'
  | 'in_transit'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface TransferItem {
  id: string;
  variantId: string;
  quantityRequested: number;
  quantityDispatched: number;
  // Arrived in good condition
  quantityReceived: number;
  quantityWrittenOff: number;
  // Arrived damaged
  quantityDamaged?: number;
  // Reported missing: still in transit until found or written off
  quantityMissing?: number;
  // Went back to the source (cancelled after dispatch)
  quantityReturned?: number;
  // Arrived above what was dispatched
  quantityOverReceived?: number;
  // Detail only: dispatched − received − damaged − written off − returned
  quantityInTransit?: number;
  // Left out without inventory.cost.view
  unitCost?: number | null;
  variant?: { id: string; sku: string; name: LocalizedText | null; product?: { name: LocalizedText } };
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  notes: string | null;
  createdById: string;
  // Dispatched units sit on the system transit location
  transitLedger?: boolean;
  transitLocationId?: string | null;
  approvalRequired?: boolean;
  requestedById?: string | null;
  requestedAt?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  // The last dispatch was made (nothing more will be sent)
  dispatchComplete?: boolean;
  dispatchedById?: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: TransferItem[];
  // Detail only: dispatches, receipts, write-offs and returns, oldest first
  events?: TransferEvent[];
}

export interface TransferEventLine {
  itemId?: string;
  variantId?: string;
  quantity?: number;
  damaged?: number;
  missing?: number;
}

export interface TransferEvent {
  id: string;
  kind: 'dispatch' | 'receipt' | 'write_off' | 'return';
  idempotencyKey: string | null;
  userId: string;
  approverId: string | null;
  lines: TransferEventLine[];
  notes: string | null;
  createdAt: string;
}

export interface TransferInput {
  fromLocationId: string;
  toLocationId: string;
  notes?: string | null;
  items: { variantId: string; quantity: number }[];
}

// Omit items to dispatch / receive / write off everything still possible
export interface TransferQuantities {
  items?: { itemId: string; quantity: number }[];
  notes?: string;
  // Generated once per dialog: a retry / double-click posts nothing twice
  idempotencyKey?: string;
}

export interface TransferDispatchInput extends TransferQuantities {
  // Last dispatch: what is not sent is dropped
  complete?: boolean;
}

export interface TransferReceiptLine {
  itemId: string;
  // Arrived in good condition
  quantity: number;
  damaged?: number;
  // Reported missing (stays in transit)
  missing?: number;
}

export interface TransferReceiveInput {
  items?: TransferReceiptLine[];
  notes?: string;
  idempotencyKey?: string;
}

// ---- Aging ----

export type AgingBucketKey = '0-30' | '31-60' | '61-90' | '91-180' | '181+' | 'unknown';

export interface AgingBucket {
  key: AgingBucketKey;
  lines: number;
  quantity: number;
  // Left out without inventory.cost.view
  stockValue?: number;
}

export interface AgingItem {
  variantId: string;
  locationId: string;
  sku: string;
  productName: LocalizedText;
  variantName: LocalizedText | null;
  locationCode: string;
  locationName: string | null;
  stockStatus: LocationStockStatus;
  quantityOnHand: number;
  lastReceivedAt: string | null;
  // Last purchase receipt, else the first arrival at the location
  agedFrom: string | null;
  days: number | null;
  bucket: AgingBucketKey;
  // Left out without inventory.cost.view
  stockValue?: number | null;
}

export interface AgingReport {
  generatedAt: string;
  buckets: AgingBucket[];
  items: AgingItem[];
}

// ---- Valuation ----

export interface RevaluationResult extends Omit<RevaluationValuation, 'beforeCost'> {
  movementId: string;
  variantId: string;
  sku: string;
  kind: 'manual' | 'costing_method_change';
  quantity: number;
  beforeCost: number | null;
}

export interface CostingMethodChangeResult {
  method: 'average' | 'fifo';
  // Number of variants revalued
  revalued: number;
  entries: (Partial<RevaluationResult> & Record<string, unknown>)[];
}

// ---- Projection rebuild ----

export interface RebuildReport {
  locationId: string | null;
  applied: boolean;
  totals: { levels: number; variants: number };
  levelDifferences: {
    variantId: string;
    locationId: string;
    sku: string | null;
    productName: LocalizedText | null;
    locationCode: string | null;
    projected: number;
    ledger: number;
    difference: number;
  }[];
  variantDifferences: {
    variantId: string;
    sku: string;
    productName: LocalizedText | null;
    current: number;
    expected: number;
    difference: number;
  }[];
}

export interface StockReservation {
  id: string;
  variantId: string;
  locationId: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  expiresAt: string | null;
  status: 'active' | 'released' | 'committed' | 'expired';
  createdAt: string;
  variant?: { sku: string; name: LocalizedText | null; product?: { name: LocalizedText } };
}

export const stockCountsApi = {
  list: async (params?: { status?: StockCountStatus; locationId?: string }): Promise<StockCount[]> => {
    const { data } = await apiClient.get('/inventory/counts', { params });
    return data;
  },
  get: async (id: string): Promise<StockCountDetail> => {
    const { data } = await apiClient.get(`/inventory/counts/${id}`);
    return data;
  },
  create: async (input: {
    locationId: string;
    categoryId?: string;
    variantIds?: string[];
    blind?: boolean;
    notes?: string;
  }): Promise<StockCountDetail> => {
    const { data } = await apiClient.post('/inventory/counts', input);
    return data;
  },
  // reason: omit to keep, null to clear
  enter: async (
    id: string,
    items: { variantId: string; countedQuantity: number | null; reason?: string | null }[]
  ): Promise<StockCountDetail> => {
    const { data } = await apiClient.put(`/inventory/counts/${id}/items`, { items });
    return data;
  },
  // idempotencyKey: one per action, reused on retries (Idempotency-Key header)
  submit: async (id: string, idempotencyKey?: string): Promise<StockCountDetail> => {
    const { data } = await apiClient.post(
      `/inventory/counts/${id}/submit`,
      {},
      { headers: withIdempotencyKey(idempotencyKey) }
    );
    return data;
  },
  approve: async (id: string, headers?: Headers, idempotencyKey?: string): Promise<StockCountDetail> => {
    const { data } = await apiClient.post(
      `/inventory/counts/${id}/approve`,
      {},
      { headers: withIdempotencyKey(idempotencyKey, headers) }
    );
    return data;
  },
  reject: async (id: string, reason?: string, headers?: Headers): Promise<StockCountDetail> => {
    const { data } = await apiClient.post(`/inventory/counts/${id}/reject`, { reason }, { headers });
    return data;
  },
  cancel: async (id: string, reason?: string): Promise<StockCountDetail> => {
    const { data } = await apiClient.post(`/inventory/counts/${id}/cancel`, { reason });
    return data;
  },
};

export const transfersApi = {
  list: async (params?: { status?: TransferStatus; locationId?: string }): Promise<StockTransfer[]> => {
    const { data } = await apiClient.get('/inventory/transfers', { params });
    return data;
  },
  get: async (id: string): Promise<StockTransfer> => {
    const { data } = await apiClient.get(`/inventory/transfers/${id}`);
    return data;
  },
  create: async (input: TransferInput): Promise<StockTransfer> => {
    const { data } = await apiClient.post('/inventory/transfers', input);
    return data;
  },
  update: async (id: string, input: TransferInput): Promise<StockTransfer> => {
    const { data } = await apiClient.put(`/inventory/transfers/${id}`, input);
    return data;
  },
  // Submit a draft: approved at once unless the store's approval setting applies ('requested')
  request: async (id: string): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/request`, {});
    return data;
  },
  // Needs inventory.transfer.approve (or a manager's approval); not by the requester
  approve: async (id: string, headers?: Headers): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/approve`, {}, { headers });
    return data;
  },
  // Back to draft
  reject: async (id: string, reason?: string, headers?: Headers): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/reject`, { reason }, { headers });
    return data;
  },
  // Repeatable until everything is sent or `complete`
  dispatch: async (id: string, input: TransferDispatchInput = {}): Promise<StockTransfer> => {
    // The body key is also sent as the Idempotency-Key header
    const { data } = await apiClient.post(`/inventory/transfers/${id}/dispatch`, input, {
      headers: withIdempotencyKey(input.idempotencyKey),
    });
    return data;
  },
  // Over-receipt above the store's tolerance needs inventory.transfer.approve (headers)
  receive: async (id: string, input: TransferReceiveInput = {}, headers?: Headers): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/receive`, input, {
      headers: withIdempotencyKey(input.idempotencyKey, headers),
    });
    return data;
  },
  // A stock loss: needs a reason, and inventory.adjust or a manager's approval (headers)
  writeOff: async (
    id: string,
    input: TransferQuantities & { reason: string },
    headers?: Headers
  ): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/write-off`, input, { headers });
    return data;
  },
  // After dispatch, units still in transit go back to the source
  cancel: async (id: string, reason?: string): Promise<StockTransfer> => {
    const { data } = await apiClient.post(`/inventory/transfers/${id}/cancel`, { reason });
    return data;
  },
  // Store transfer settings (PATCH /settings; needs settings.manage)
  updateSettings: async (
    input: Partial<TransferSettings>,
    idempotencyKey?: string
  ): Promise<Partial<TransferSettings>> => {
    const { data } = await apiClient.patch('/settings', input, { headers: withIdempotencyKey(idempotencyKey) });
    return data;
  },
};

export const inventoryApi = {
  // The transit location is left out unless locationId names it
  stock: async (params: {
    search?: string;
    locationId?: string;
    lowStock?: boolean;
    sellableOnly?: boolean;
  }): Promise<StockRow[]> => {
    const { data } = await apiClient.get('/inventory/stock', { params });
    return data;
  },
  movements: async (params: { variantId?: string; locationId?: string; limit?: number }): Promise<StockMovement[]> => {
    const { data } = await apiClient.get('/inventory/movements', { params });
    return data;
  },
  adjust: async (input: {
    locationId: string;
    reason: AdjustmentReason;
    mode: 'set' | 'delta';
    notes?: string;
    items: { variantId: string; quantity: number }[];
  }) => {
    const { data } = await apiClient.post('/inventory/adjustments', input);
    return data;
  },
  receive: async (input: {
    locationId: string;
    reference?: string;
    notes?: string;
    // Damaged units go to the warehouse's quarantine / damaged location when there is one;
    // a variant may appear twice (once per condition)
    items: { variantId: string; quantity: number; cost?: number; condition?: 'good' | 'damaged' }[];
  }) => {
    const { data } = await apiClient.post('/inventory/receive', input);
    return data;
  },
  // Days since each variant was last received per location
  aging: async (params: { locationId?: string; search?: string; minDays?: number }): Promise<AgingReport> => {
    const { data } = await apiClient.get('/inventory/aging', { params });
    return data;
  },
  // New unit cost + a zero-quantity revaluation entry (inventory.adjust + inventory.cost.view; approvable)
  revalue: async (
    input: { variantId: string; newCost: number; reason: string },
    headers?: Headers
  ): Promise<RevaluationResult> => {
    const { data } = await apiClient.post('/inventory/revaluations', input, { headers });
    return data;
  },
  // Switch average ↔ FIFO, revaluing held stock (settings.manage + inventory.cost.view)
  changeCostingMethod: async (input: {
    method: 'average' | 'fifo';
    reason: string;
  }): Promise<CostingMethodChangeResult> => {
    const { data } = await apiClient.post('/inventory/costing-method', input);
    return data;
  },
  reservations: async (params?: {
    status?: StockReservation['status'];
    variantId?: string;
    locationId?: string;
  }): Promise<StockReservation[]> => {
    const { data } = await apiClient.get('/inventory/reservations', { params });
    return data;
  },
  // Dry run: projections vs the movement ledger
  rebuildPreview: async (locationId?: string): Promise<RebuildReport> => {
    const { data } = await apiClient.get('/inventory/rebuild', { params: { locationId } });
    return data;
  },
  rebuildApply: async (locationId?: string, headers?: Headers): Promise<RebuildReport> => {
    const { data } = await apiClient.post('/inventory/rebuild', locationId ? { locationId } : {}, { headers });
    return data;
  },
};
