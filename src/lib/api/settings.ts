import apiClient, { withIdempotencyKey } from './client';
import { crudApi, LocalizedText } from './crud';

export interface StoreSettings {
  storeName: string;
  currencyCode: string;
  pricesIncludeTax: boolean;
  defaultTaxRateId: string | null;
  receiptHeader: string;
  receiptFooter: string;
  lowStockThreshold: number;
  maxDiscountPercent: number;
  receiptFormat: '58mm' | '80mm' | 'a4' | 'letter';
  heldCartExpiryHours: number;
  requireOpenShift: boolean;
  // Hour (branch time) the trading day starts: sales before it count for the previous business date
  businessDayCutoffHour?: number;
  // Sales totalling 0.00 may complete without payment (with pos.discount.override)
  allowZeroValueSales?: boolean;
  returnWindowDays: number;
  shiftVarianceTolerance: number;
  expenseApprovalThreshold: number;
  costingMethod: 'average' | 'fifo';
  purchaseApprovalThreshold: number;
  // % above the ordered quantity that may be received without purchasing.approve
  purchaseOverReceiptTolerance: number;
  // % a supplier invoice price may exceed the order price before it needs approval
  purchaseInvoiceVarianceTolerance: number;
  countVarianceTolerance: number;
  // Transfers needing inventory.transfer.approve before dispatch:
  // never, above transferApprovalThreshold (value at cost, store currency), or always
  transferApprovalMode: TransferApprovalMode;
  transferApprovalThreshold: number;
  // Receiving more than was dispatched, up to this % of it, needs no approval
  transferOverReceiptTolerancePercent: number;
  offlineLeaseHours: number;
  // Offline selling limits carried by the till's signed lease (0 = no limit):
  // largest single sale, number of sales and their total under one lease
  offlineMaxSaleAmount: number;
  offlineMaxSales: number;
  offlineMaxTotal: number;
  // Gift cards sold expire this many months later (0 = never)
  giftCardExpiryMonths?: number;
  requireMfaForAdmins: boolean;
  // Business information (receipts and invoices)
  businessLegalName: string;
  businessAddressLine1: string;
  businessAddressLine2: string;
  businessCity: string;
  businessState: string;
  businessPostalCode: string;
  businessCountry: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  businessTaxId: string;
  businessRegistrationNumber: string;
  businessLogoUrl: string;
  returnPolicy: string;
  // Receipts & printing
  receiptTemplate: ReceiptTemplate;
  receiptShowLogo: boolean;
  receiptShowBusinessDetails: boolean;
  receiptShowTaxBreakdown: boolean;
  receiptShowSku: boolean;
  receiptShowCashier: boolean;
  receiptShowCustomer: boolean;
  receiptShowLoyalty: boolean;
  receiptShowBarcode: boolean;
  receiptShowReturnPolicy: boolean;
  receiptFontSize: 'small' | 'normal' | 'large';
  autoPrintReceipt: boolean;
  receiptCopies: number;
  // Loyalty
  loyaltyEnabled: boolean;
  loyaltyEarnPercent: number;
  loyaltyPointValue: number;
  loyaltyMinRedeemPoints: number;
  loyaltyMaxRedeemPercent: number;
  // Other accepted currencies: units per 1 unit of currencyCode (e.g. { HTG: 132.5 })
  // Sell rates (that currency coming in: a customer paying in HTG)
  exchangeRates: Record<string, number>;
  // Buy rates (dollars turned into that currency: change in HTG); missing = sell rate
  exchangeBuyRates?: Record<string, number>;
  // Default language of the app for everyone in the store (each user can override it)
  language: 'en' | 'fr' | 'ht' | 'es';
  // Weighted / price-embedded barcodes (GS1 variable measure): prefixes 20–29 read
  // as scale labels (empty = off), what the value holds, PLU digits, value decimals
  weightedBarcodePrefixes?: string[];
  weightedBarcodeLayout?: 'weight' | 'price';
  weightedBarcodeItemCodeLength?: number;
  weightedBarcodeValueDecimals?: number;
}

export type ReceiptTemplate = 'classic' | 'compact' | 'modern';

export type TransferApprovalMode = 'never' | 'threshold' | 'always';

// Store settings that drive transfers (Inventory → Transfers → Settings)
export type TransferSettings = Pick<
  StoreSettings,
  'transferApprovalMode' | 'transferApprovalThreshold' | 'transferOverReceiptTolerancePercent'
>;

export type SettingsVersionStatus = 'applied' | 'scheduled' | 'cancelled';

export interface SettingsVersion {
  id: string;
  version: number;
  status: SettingsVersionStatus;
  changedKeys: string[];
  changes: Partial<StoreSettings>;
  effectiveFrom: string;
  appliedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  note: string | null;
  actorId: string | null;
  actorName: string | null;
  cancelledByName?: string | null;
}

export interface SettingsVersionDetail extends SettingsVersion {
  snapshot: Partial<StoreSettings>;
}

// PATCH /settings: optional future effectiveFrom schedules the change
export type StoreSettingsUpdate = Partial<StoreSettings> & { effectiveFrom?: string; note?: string };

export interface Branch {
  id: string;
  // Optimistic concurrency (sent back as If-Match when editing)
  version?: number;
  code: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currencyCode: string;
  taxNumber: string | null;
  status: 'active' | 'inactive';
}

export interface Register {
  id: string;
  // Optimistic concurrency (sent back as If-Match when editing)
  version?: number;
  branchId: string;
  code: string;
  name: string;
  defaultLocationId: string | null;
  // assigned: one cashier per drawer shift; shared: cashiers share the drawer's shift
  drawerPolicy?: 'assigned' | 'shared';
  status: 'active' | 'inactive';
  branch?: Branch;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  warehouseType: 'standard' | 'transit' | 'quarantine';
  addressLine1: string | null;
  city: string | null;
  countryCode: string | null;
  status: 'active' | 'inactive';
}

// What stock at a location may be used for. Only sellable stock is available for sale;
// 'transit' is the system location holding dispatched transfer units.
export type LocationStockStatus = 'sellable' | 'quarantine' | 'damaged' | 'transit';

export interface InventoryLocation {
  id: string;
  warehouseId: string;
  code: string;
  name: string | null;
  locationType: 'bin' | 'aisle' | 'zone';
  isSellable: boolean;
  // Kept in sync with isSellable server-side (absent from older responses)
  stockStatus?: LocationStockStatus;
}

export type PaymentMethodType =
  | 'cash'
  | 'card'
  | 'mobile'
  | 'bank_transfer'
  | 'check'
  | 'store_credit'
  | 'other';

export interface PaymentMethod {
  id: string;
  code: string;
  name: LocalizedText;
  methodType: PaymentMethodType;
  requiresReference: boolean;
  opensDrawer: boolean;
  status: 'active' | 'inactive';
}

export interface TaxRate {
  id: string;
  code: string;
  name: LocalizedText;
  taxType: 'percentage' | 'fixed_amount';
  rate: number;
  countryCode: string | null;
  stateProvince: string | null;
  status: 'active' | 'inactive';
}

export const settingsApi = {
  get: async (): Promise<StoreSettings> => {
    const { data } = await apiClient.get('/settings');
    return data;
  },
  // idempotencyKey: one per edit, reused on retries (Idempotency-Key header)
  update: async (input: StoreSettingsUpdate, idempotencyKey?: string): Promise<StoreSettings> => {
    const { data } = await apiClient.patch('/settings', input, { headers: withIdempotencyKey(idempotencyKey) });
    return data;
  },
  // History: applied, scheduled and cancelled versions (newest first)
  versions: async (limit = 50): Promise<SettingsVersion[]> => {
    const { data } = await apiClient.get('/settings/versions', { params: { limit } });
    return data;
  },
  version: async (id: string): Promise<SettingsVersionDetail> => {
    const { data } = await apiClient.get(`/settings/versions/${id}`);
    return data;
  },
  cancelVersion: async (id: string): Promise<SettingsVersionDetail> => {
    const { data } = await apiClient.post(`/settings/versions/${id}/cancel`);
    return data;
  },
  uploadLogo: async (file: File): Promise<StoreSettings> => {
    const body = new FormData();
    body.append('file', file);
    const { data } = await apiClient.post('/settings/logo', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  removeLogo: async (): Promise<StoreSettings> => {
    const { data } = await apiClient.delete('/settings/logo');
    return data;
  },
  // Creates a default branch, stockroom, register and payment methods
  initialize: async () => {
    const { data } = await apiClient.post('/settings/initialize');
    return data;
  },
};

export const branchesApi = crudApi<Branch>('/branches');

// Which warehouses serve which branch: branch-limited users only see the stock of
// their branches' warehouses. Changed by users with access to every branch.
export interface BranchWarehouse {
  branchId: string;
  warehouseId: string;
}

export const branchWarehousesApi = {
  list: async (): Promise<BranchWarehouse[]> => {
    const { data } = await apiClient.get('/branch-warehouses');
    return data;
  },
  set: async (branchId: string, warehouseIds: string[]): Promise<{ branchId: string; warehouseIds: string[] }> => {
    const { data } = await apiClient.put(`/branch-warehouses/${branchId}`, { warehouseIds });
    return data;
  },
};
export const registersApi = crudApi<Register>('/registers');
export const warehousesApi = crudApi<Warehouse>('/warehouses');
export const locationsApi = crudApi<InventoryLocation>('/locations');
export const paymentMethodsApi = crudApi<PaymentMethod>('/payment-methods');
export const taxRatesApi = crudApi<TaxRate>('/tax-rates');
