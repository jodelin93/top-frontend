import apiClient from './client';
import type { LocalizedText } from './crud';
import type { Category } from './categories';
import type { Customer } from './customers';
import type { PaymentMethod, Register, StoreSettings, Branch } from './settings';
import type { CatalogUnit } from '@/lib/pos/quantity';

// Lifecycle (see top-backend/src/sales/sale-lifecycle.ts)
export type SaleStatus =
  | 'draft'
  | 'held'
  | 'payment_pending'
  | 'completed'
  | 'cancelled'
  | 'voided'
  | 'refunded'
  | 'partially_refunded';

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unknown'
  | 'refunded';

// Headers for a call a manager may have approved (X-Approval-Token)
export type ApprovalHeaders = Record<string, string>;

export interface SaleItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  lineNumber: number;
  // Tax rate applied to the line (percent)
  taxRate?: number | null;
  // Catalog price when the price was overridden at the till
  originalUnitPrice?: number | null;
  // Line note typed at the till
  notes?: string | null;
  // discountReason: why the line discount was given; stockTracked false: a service
  // storedValue: a gift card sold (a liability, left out of net sales)
  metadata?: {
    discountPercent?: number;
    discountReason?: string;
    stockTracked?: boolean;
    storedValue?: boolean;
    giftCard?: boolean;
    // Measured item (sold by weight / length / volume): unit code and decimals
    unit?: string;
    unitPrecision?: number;
  } | null;
}

export interface Payment {
  id: string;
  paymentMethodId: string;
  amount: number;
  reference: string | null;
  status: PaymentStatus;
  provider?: string | null;
  providerReference?: string | null;
  failureReason?: string | null;
  paymentMethod?: PaymentMethod;
  // Paid in another currency: what was handed over and the rate (units per 1 sale unit)
  tenderedCurrency?: string | null;
  tenderedAmount?: number | string | null;
  exchangeRate?: number | string | null;
}

// Change handed back in another currency than the sale's
export interface ChangeTender {
  currencyCode: string;
  amount: number;
  exchangeRate: number;
}

/**
 * Seller identity frozen when the sale completed (top-backend/src/sales/document-snapshot.ts).
 * Receipts use it over the current settings so a reprint never changes. Absent on older sales.
 */
export interface SaleDocumentSnapshot {
  version: 1;
  capturedAt: string;
  storeName: string;
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
  receiptHeader: string;
  receiptFooter: string;
  returnPolicy: string;
  receiptTemplate: StoreSettings['receiptTemplate'];
  receiptFormat: StoreSettings['receiptFormat'];
  pricesIncludeTax: boolean;
  branch: {
    id: string;
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
    taxNumber: string | null;
  };
}

// A staff member as the till lists them (salesperson picker)
export interface StaffMember {
  id: string;
  name: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  branchId: string;
  registerId: string;
  customerId: string | null;
  userId: string;
  saleDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  changeAmount: number;
  currencyCode: string;
  notes: string | null;
  status: SaleStatus;
  // Provisional number printed while offline (OFFLINE-XXXXXXXX), kept after sync
  offlineNumber?: string | null;
  deviceId?: string | null;
  deviceSequence?: number | null;
  shiftId?: string | null;
  // Copies printed after the original receipt
  receiptPrintCount?: number;
  heldUntil?: string | null;
  heldLabel?: string | null;
  metadata?: {
    changeTender?: ChangeTender | null;
    estimateId?: string | null;
    // Why the manual cart discount was given
    cartDiscountReason?: string | null;
    // New prices shown and confirmed at the till before tendering (AC05)
    repricing?: { confirmedAt: string; confirmedBy: string; previousTotal: number | null; total: number } | null;
  } | null;
  // Staff member credited with the sale (the cashier is `user`)
  salespersonId?: string | null;
  salesperson?: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
  documentSnapshot?: SaleDocumentSnapshot | null;
  items?: SaleItem[];
  payments?: Payment[];
  customer?: Customer | null;
  register?: Register;
  branch?: Branch;
  user?: { id: string; firstName: string | null; lastName: string | null; email: string };
  // Only in the response of the sale that sold them (the full codes are never stored)
  issuedGiftCards?: IssuedGiftCard[];
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

export interface SaleItemInput {
  variantId: string;
  quantity: number;
  discountPercent?: number;
  // Price override (online: needs pos.price.override or an approval); offline: price charged
  unitPrice?: number;
  // Required when the line discount is above the store limit
  discountReason?: string;
  note?: string;
}

export interface CartDiscountInput {
  type: 'percentage' | 'fixed';
  value: number;
  // Required when the discount is above the store limit
  reason?: string;
}

export interface QuoteInput {
  registerId: string;
  // Selling an estimate at its quoted prices
  estimateId?: string;
  customerId?: string;
  priceListId?: string;
  discountCode?: string;
  cartDiscount?: CartDiscountInput;
  // May be empty when only gift cards are sold
  items: SaleItemInput[];
  // Gift cards sold on the sale (online only): no tax, no discount
  giftCards?: GiftCardLineInput[];
}

export interface GiftCardLineInput {
  amount: number;
  // Code of a pre-printed card; generated by the server when omitted
  code?: string;
}

// A gift card sold on the sale: the full code is only in the response of the sale
export interface IssuedGiftCard {
  accountId: string;
  code: string;
  last4: string;
  amount: number;
  status: 'pending' | 'active' | 'void';
}

export interface CreateSaleInput extends QuoteInput {
  // Staff member credited with the sale
  salespersonId?: string;
  // Empty only for a zero-value sale (store setting allowZeroValueSales)
  payments: {
    paymentMethodId: string;
    amount: number;
    reference?: string;
    idempotencyKey?: string;
    // Paid in another accepted currency: amount handed over in it, and the till's rate
    currencyCode?: string;
    tenderedAmount?: number;
    exchangeRate?: number;
    // Gift card tender: the card's code
    giftCardCode?: string;
  }[];
  // Currency the change is handed back in (default: the sale currency)
  changeCurrency?: string;
  notes?: string;
  idempotencyKey?: string;
  offlineCapturedAt?: string;
  // Receipt number printed while offline, stored on the sale when it syncs
  offlineNumber?: string;
  // Device that recorded the sale and its per-device sequence (set by the offline layer)
  deviceId?: string;
  deviceSequence?: number;
  // Held/resumed cart this sale completes
  heldSaleId?: string;
  // AC05: the cart was repriced and the cashier confirmed the new prices (stored on the sale)
  repricedConfirmedAt?: string;
  repricedPreviousTotal?: number;
}

export interface HoldInput extends QuoteInput {
  salespersonId?: string;
  heldSaleId?: string;
  label?: string;
  notes?: string;
}

// A held cart, as the POS rebuilds it on resume
export interface ResumedCart {
  heldSaleId: string;
  customerId: string | null;
  salespersonId?: string | null;
  discountCode: string | null;
  cartDiscount: CartDiscountInput | null;
  priceListId: string | null;
  notes: string;
  items: {
    variantId: string;
    productId: string;
    categoryId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    catalogPrice: number;
    discountPercent: number;
    taxRate: number | null;
    stock: number | null;
    stockTracked?: boolean;
    note?: string | null;
    discountReason?: string | null;
    // Measured items: decimal quantities shown with the unit
    unit?: CatalogUnit | null;
  }[];
}

export interface Quote {
  currencyCode: string;
  taxRate: number;
  discountCode: string | null;
  discountMessage: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  // Permissions the cart uses (discounts / price overrides)
  overrides?: string[];
  lines: {
    variantId: string;
    sku: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    catalogPrice?: number;
    subtotal: number;
    discountAmount: number;
    taxRate?: number;
    taxAmount: number;
    total: number;
  }[];
}

export interface PosContext {
  settings: StoreSettings;
  taxRate: number;
  registers: (Register & { branch: Branch })[];
  paymentMethods: PaymentMethod[];
  categories: Category[];
}

export interface CatalogItem {
  variantId: string;
  productId: string;
  categoryId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  // Units available (on hand minus reserved); null when not tracked or no location
  stock: number | null;
  // False for services / non-stock items (absent in old cached catalogs: tracked)
  stockTracked?: boolean;
  /** @deprecated D018: negative stock is never allowed; still sent by the server and old cached catalogs, ignored */
  allowBackorder?: boolean;
  imageUrl: string | null;
  // Tax rate of the product (tax category or store default); absent in old cached catalogs
  taxRate?: number;
  // Unit of measure; allowsDecimals = measured item (sold by weight / length / volume).
  // Null / absent (old cached catalogs) = by the piece
  unit?: CatalogUnit | null;
  // PLU / scale item code read from weighted and price-embedded barcodes
  pluCode?: string | null;
  // Found through a weighted / price-embedded barcode: the quantity it carries
  // (weight, or label price ÷ unit price) and the label price (price labels)
  scan?: { barcode: string; quantity: number | null; amount: number | null };
}

export const salesApi = {
  list: async (params: {
    from?: string;
    to?: string;
    status?: SaleStatus;
    customerId?: string;
    registerId?: string;
    salespersonId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Sale>> => {
    const { data } = await apiClient.get('/sales', { params });
    return data;
  },
  get: async (id: string): Promise<Sale> => {
    const { data } = await apiClient.get(`/sales/${id}`);
    return data;
  },
  quote: async (input: QuoteInput, headers?: ApprovalHeaders): Promise<Quote> => {
    const { data } = await apiClient.post('/sales/quote', input, { headers });
    return data;
  },
  create: async (input: CreateSaleInput, headers?: ApprovalHeaders): Promise<Sale> => {
    const { data } = await apiClient.post('/sales', input, { headers });
    return data;
  },
  hold: async (input: HoldInput): Promise<Sale> => {
    const { data } = await apiClient.post('/sales/hold', input);
    return data;
  },
  held: async (params: { registerId?: string; branchId?: string }): Promise<Sale[]> => {
    const { data } = await apiClient.get('/sales/held', { params });
    return data;
  },
  resume: async (id: string): Promise<{ sale: Sale; cart: ResumedCart }> => {
    const { data } = await apiClient.post(`/sales/${id}/resume`);
    return data;
  },
  cancel: async (id: string, reason?: string): Promise<Sale> => {
    const { data } = await apiClient.post(`/sales/${id}/cancel`, { reason });
    return data;
  },
  // Count a reprint; the receipt is then printed as a COPY
  reprint: async (id: string): Promise<{ id: string; saleNumber: string; receiptPrintCount: number }> => {
    const { data } = await apiClient.post(`/sales/${id}/reprint`);
    return data;
  },
  // headers: optional X-Approval-Token from a manager override
  void: async (id: string, reason: string, headers?: Record<string, string>): Promise<Sale> => {
    const { data } = await apiClient.post(`/sales/${id}/void`, { reason }, { headers });
    return data;
  },
};

export const posApi = {
  context: async (): Promise<PosContext> => {
    const { data } = await apiClient.get('/pos/context');
    return data;
  },
  catalog: async (params: {
    registerId?: string;
    search?: string;
    barcode?: string;
    categoryId?: string;
    limit?: number;
  }): Promise<CatalogItem[]> => {
    const { data } = await apiClient.get('/pos/catalog', { params });
    return data;
  },
  // Staff a sale can be credited to (salesperson)
  staff: async (): Promise<StaffMember[]> => {
    const { data } = await apiClient.get('/pos/staff');
    return data;
  },
};

// ---- Review queue (conflict cases) ----

export type ConflictCaseType =
  | 'offline_oversell'
  | 'offline_price'
  | 'late_shift'
  | 'offline_lease'
  | 'lost_device'
  | 'offline_no_shift';
export type ConflictCaseStatus = 'open' | 'resolved' | 'dismissed';

export interface ConflictCase {
  id: string;
  type: ConflictCaseType;
  status: ConflictCaseStatus;
  saleId: string | null;
  deviceId: string | null;
  details: {
    saleNumber?: string;
    offlineNumber?: string | null;
    locationId?: string;
    // offline_oversell
    lines?: { variantId: string; sku: string; productName: string; quantity: number; shortBy: number }[];
    // offline_price
    missingPermissions?: string[];
    reasons?: string[];
    // offline_lease: why the sale falls outside the till's signed lease
    issues?: string[];
    // lost_device: the till and the sales it may never upload
    deviceName?: string;
    unsyncedSales?: number;
    lastSyncAt?: string | null;
    [key: string]: unknown;
  };
  openedAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNote: string | null;
  sale: { id: string; saleNumber: string; offlineNumber: string | null; saleDate: string } | null;
}

export const conflictCasesApi = {
  list: async (params: {
    status?: ConflictCaseStatus;
    type?: ConflictCaseType;
    saleId?: string;
    // Cases raised by one till (sync dashboard link)
    deviceId?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<ConflictCase>> => {
    const { data } = await apiClient.get('/conflict-cases', { params });
    return data;
  },
  openCount: async (): Promise<number> => {
    const { data } = await apiClient.get('/conflict-cases/open-count');
    return data.open;
  },
  resolve: async (id: string, input: { status: 'resolved' | 'dismissed'; note: string }): Promise<ConflictCase> => {
    const { data } = await apiClient.post(`/conflict-cases/${id}/resolve`, input);
    return data;
  },
};

export type { LocalizedText };
