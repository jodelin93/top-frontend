import apiClient, { withIdempotencyKey } from './client';

// Mirrors top-backend/src/shifts (docs/features/shifts-expenses.md)

export type ShiftStatus = 'open' | 'closing' | 'closed';
export type CashMovementType =
  | 'opening_float'
  | 'paid_in'
  | 'paid_out'
  | 'safe_drop'
  | 'expense'
  | 'refund'
  // Drawer ledger only (not part of the expected cash): net cash of a sale, drawer opened without a sale
  | 'sale'
  | 'no_sale';
export type ManualMovementType = 'paid_in' | 'paid_out' | 'safe_drop';

export interface DenominationCount {
  value: number;
  quantity: number;
}

export interface CashBreakdown {
  openingFloat: number;
  cashSales: number;
  changeGiven: number;
  paidIn: number;
  paidOut: number;
  safeDrops: number;
  expensePayouts: number;
  cashRefunds: number;
  expected: number;
  // Cash taken in other currencies (absent on shifts closed before multi-currency)
  foreign?: ForeignCash[];
}

export interface ForeignCash {
  currencyCode: string;
  // In the drawer at opening (carried over by a handover)
  openingFloat?: number;
  cashSales: number;
  changeGiven: number;
  expected: number;
}

export interface ForeignCount {
  currencyCode: string;
  expected: number;
  counted: number;
  variance: number;
  exchangeRate: number | null;
  overTolerance?: boolean;
}

export interface PaymentMethodTotal {
  paymentMethodId: string;
  name: string;
  methodType: string;
  count: number;
  amount: number;
}

export interface ShiftSalesSummary {
  count: number;
  total: number;
  voidedCount: number;
  voidedTotal: number;
  byPaymentMethod: PaymentMethodTotal[];
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  reference: string | null;
  expenseId: string | null;
  userId: string;
  userName: string | null;
  approverId: string | null;
  createdAt: string;
  sourceType?: string | null;
  sourceId?: string | null;
}

/** Manager corrections of a closed shift (the shift itself stays frozen) */
export type ShiftCorrectionType = 'expected' | 'counted';

export interface ShiftCorrections {
  corrections: {
    id: string;
    type: ShiftCorrectionType;
    amount: number;
    reason: string;
    createdAt: string;
    createdBy: string | null;
    approvedBy: string | null;
  }[];
  expectedAdjustment: number;
  countedAdjustment: number;
  // Corrected figures (null when the shift has no count)
  expected: number | null;
  counted: number | null;
  variance: number | null;
}

/** Every movement of the drawer, per-sale cash and no-sale openings included */
export interface DrawerLedger {
  shiftId: string;
  shiftNumber: string;
  currencyCode: string;
  entries: (CashMovement & { direction: 'in' | 'out' | 'none'; inExpectedCash: boolean })[];
  cashSalesTotal: number;
  saleCount: number;
  noSaleCount: number;
}

export type DrawerPolicy = 'assigned' | 'shared';

export interface Drawer {
  id: string;
  registerId: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  version?: number;
  activeShift: { id: string; shiftNumber: string; openedById: string; shared: boolean } | null;
}

/** Sales filed under a closed shift after it closed (e.g. offline sales uploaded late) */
export interface LateSales {
  count: number;
  byCurrency: { currencyCode: string; count: number; total: number }[];
  // Cash kept (tendered − change) in the shift currency
  cash: number;
  foreignCash: { currencyCode: string; amount: number }[];
  sales: {
    id: string;
    saleNumber: string;
    saleDate: string;
    uploadedAt: string;
    total: number;
    currencyCode: string;
  }[];
}

export interface ShiftSummary {
  id: string;
  shiftNumber: string;
  status: ShiftStatus;
  registerId: string;
  registerName: string | null;
  drawerId?: string | null;
  drawerName?: string | null;
  // Drawer policy 'shared': cashiers of the register work on this shift together
  shared?: boolean;
  // Trading day (branch timezone, store cutoff hour)
  businessDate?: string | null;
  previousShiftId?: string | null;
  handedOverToId?: string | null;
  currencyCode: string;
  openedById: string;
  openedByName: string | null;
  openedAt: string;
  openingFloat: number;
  // Foreign cash in the drawer at opening (carried over by a handover)
  openingForeignCash?: { currencyCode: string; amount: number }[] | null;
  blindCount: boolean;
  closingStartedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  closedAt: string | null;
  countedCash: number | null;
  // null while a blind count is running (unless you manage shifts)
  expectedCash: number | null;
  variance: number | null;
  varianceReason: string | null;
  forceClosed: boolean;
  overTolerance?: boolean;
  // Counted drawer cash in other currencies (closed shifts)
  foreignCash?: ForeignCount[] | null;
  // Closed shifts in the list: sales uploaded after the close
  lateSalesCount?: number;
}

export interface ShiftDetail extends ShiftSummary {
  openingDenominations: DenominationCount[] | null;
  closingDenominations: DenominationCount[] | null;
  openingNotes: string | null;
  closingNotes: string | null;
  closeApprovedById: string | null;
  // null during a blind count for cashiers
  cash: CashBreakdown | null;
  sales: ShiftSalesSummary | null;
  // Closed shifts: uploads after the close, not in the frozen figures
  lateSales?: LateSales | null;
  corrections?: ShiftCorrections | null;
  movements: CashMovement[];
  replayed?: boolean;
  // Shared drawer: the open request joined the running shift
  joined?: boolean;
  // Handover: the incoming cashier's shift
  nextShift?: {
    id: string;
    shiftNumber: string;
    openedById: string;
    openingFloat: number;
    openingForeignCash?: { currencyCode: string; amount: number }[] | null;
  } | null;
}

export interface ClosePreview {
  counted: number;
  expected: number;
  variance: number;
  tolerance: number;
  overTolerance: boolean;
  requiresReason: boolean;
  requiresApproval: boolean;
  breakdown: Omit<CashBreakdown, 'expected'>;
  // Counted vs expected for each other currency in the drawer
  foreign: ForeignCount[];
}

export interface ZReport {
  generatedAt: string;
  final: boolean;
  shift: {
    id: string;
    shiftNumber: string;
    status: ShiftStatus;
    registerId: string;
    registerName: string | null;
    currencyCode: string;
    openedAt: string;
    openedBy: string | null;
    closedAt: string | null;
    closedBy: string | null;
    approvedBy: string | null;
    blindCount: boolean;
    forceClosed: boolean;
    businessDate?: string | null;
  };
  sales: ShiftSalesSummary;
  cash: CashBreakdown;
  movements: {
    id: string;
    type: CashMovementType;
    amount: number;
    reason: string | null;
    reference: string | null;
    createdAt: string;
    user: string | null;
  }[];
  count: { denominations: DenominationCount[] | null; counted: number | null };
  variance: {
    expected: number | null;
    counted: number | null;
    variance: number | null;
    tolerance: number;
    overTolerance: boolean;
    reason: string | null;
  };
  foreignCount?: ForeignCount[] | null;
  notes: string | null;
  // Closed shifts: uploads after the close (computed when the report is read)
  lateSales?: LateSales | null;
  // Closed shifts: manager corrections (computed when the report is read)
  corrections?: ShiftCorrections | null;
}

export interface Denominations {
  currencyCode: string;
  denominations: number[];
  custom: boolean;
  defaults: number[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

export interface ShiftListQuery {
  status?: ShiftStatus;
  registerId?: string;
  userId?: string;
  from?: string;
  to?: string;
  varianceOnly?: 'true';
  page?: number;
  limit?: number;
}

export interface CountInput {
  denominations?: DenominationCount[];
  countedCash?: number;
  // Cash counted in each other currency (e.g. HTG)
  foreignCounts?: { currencyCode: string; countedCash: number }[];
}

type Headers = Record<string, string>;

export const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  opening_float: 'Opening float',
  paid_in: 'Paid in',
  paid_out: 'Paid out',
  safe_drop: 'Safe drop',
  expense: 'Expense payout',
  refund: 'Cash refund',
  sale: 'Cash sale',
  no_sale: 'No sale (drawer opened)',
};

// Movements that add cash to the drawer; no_sale moves none; everything else takes cash out
export const isCashIn = (type: CashMovementType) =>
  type === 'opening_float' || type === 'paid_in' || type === 'sale';
export const movesNoCash = (type: CashMovementType) => type === 'no_sale';
// Ledger rows kept out of the expected cash (cash sales come from the payments)
export const isLedgerOnly = (type: CashMovementType) => type === 'sale' || type === 'no_sale';

export const shiftsApi = {
  list: async (params?: ShiftListQuery): Promise<Paginated<ShiftSummary>> => {
    const { data } = await apiClient.get('/shifts', { params });
    return data;
  },
  current: async (registerId: string): Promise<{ shift: ShiftDetail | null }> => {
    const { data } = await apiClient.get('/shifts/current', { params: { registerId } });
    return data;
  },
  get: async (id: string): Promise<ShiftDetail> => {
    const { data } = await apiClient.get(`/shifts/${id}`);
    return data;
  },
  zReport: async (id: string): Promise<ZReport> => {
    const { data } = await apiClient.get(`/shifts/${id}/z-report`);
    return data;
  },
  denominations: async (currencyCode?: string): Promise<Denominations> => {
    const { data } = await apiClient.get('/shifts/denominations', { params: { currencyCode } });
    return data;
  },
  setDenominations: async (currencyCode: string, denominations: number[]): Promise<Denominations> => {
    const { data } = await apiClient.put('/shifts/denominations', { currencyCode, denominations });
    return data;
  },
  open: async (input: {
    registerId: string;
    drawerId?: string;
    openingFloat?: number;
    denominations?: DenominationCount[];
    notes?: string;
  }): Promise<ShiftDetail> => {
    const { data } = await apiClient.post('/shifts/open', input);
    return data;
  },
  addMovement: async (
    shiftId: string,
    input: { type: ManualMovementType; amount: number; reason: string; reference?: string; idempotencyKey?: string },
    headers?: Headers
  ): Promise<CashMovement> => {
    // The body key is also sent as the Idempotency-Key header
    const { data } = await apiClient.post(`/shifts/${shiftId}/movements`, input, {
      headers: withIdempotencyKey(input.idempotencyKey, headers),
    });
    return data;
  },
  startClose: async (shiftId: string, blind: boolean): Promise<ShiftDetail> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/start-close`, { blind });
    return data;
  },
  resume: async (shiftId: string): Promise<ShiftDetail> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/resume`);
    return data;
  },
  previewClose: async (shiftId: string, input: CountInput): Promise<ClosePreview> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/preview-close`, input);
    return data;
  },
  close: async (
    shiftId: string,
    input: CountInput & { idempotencyKey: string; varianceReason?: string; notes?: string },
    headers?: Headers
  ): Promise<ShiftDetail> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/close`, input, {
      headers: withIdempotencyKey(input.idempotencyKey, headers),
    });
    return data;
  },
  /** Close and hand the drawer to the next cashier (their float = the count) */
  handover: async (
    shiftId: string,
    input: CountInput & { idempotencyKey: string; handToUserId: string; varianceReason?: string; notes?: string },
    headers?: Headers
  ): Promise<ShiftDetail> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/handover`, input, {
      headers: withIdempotencyKey(input.idempotencyKey, headers),
    });
    return data;
  },
  /** No-sale: the drawer is opened without a sale (reason required) */
  drawerOpen: async (shiftId: string, input: { reason: string; idempotencyKey?: string }): Promise<CashMovement> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/drawer-open`, input, {
      headers: withIdempotencyKey(input.idempotencyKey),
    });
    return data;
  },
  ledger: async (shiftId: string): Promise<DrawerLedger> => {
    const { data } = await apiClient.get(`/shifts/${shiftId}/ledger`);
    return data;
  },
  addCorrection: async (
    shiftId: string,
    input: { type: ShiftCorrectionType; amount: number; reason: string },
    headers?: Headers
  ): Promise<ShiftCorrections> => {
    const { data } = await apiClient.post(`/shifts/${shiftId}/corrections`, input, { headers });
    return data;
  },
};

export const drawersApi = {
  list: async (registerId?: string): Promise<Drawer[]> => {
    const { data } = await apiClient.get('/drawers', { params: { registerId } });
    return data;
  },
  create: async (input: { registerId: string; code: string; name: string }): Promise<Drawer> => {
    const { data } = await apiClient.post('/drawers', input);
    return data;
  },
  update: async (id: string, input: { name?: string; status?: 'active' | 'inactive' }): Promise<Drawer> => {
    const { data } = await apiClient.patch(`/drawers/${id}`, input);
    return data;
  },
};

/** Total of a denomination count, in cents-safe arithmetic */
export function countTotal(counts: DenominationCount[]): number {
  const cents = counts.reduce((sum, c) => sum + Math.round(c.value * 100) * (c.quantity || 0), 0);
  return cents / 100;
}
