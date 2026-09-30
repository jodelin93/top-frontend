import apiClient from './client';
import { crudApi } from './crud';

type Headers = Record<string, string>;

// ---- Suppliers ----

export interface SupplierContact {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
}

export type SupplierStatus = 'active' | 'inactive' | 'blocked';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  taxNumber: string | null;
  // Net payment days
  paymentTermDays: number | null;
  // Usual days from order to delivery
  leadTimeDays: number | null;
  currencyCode: string | null;
  notes: string | null;
  contacts: SupplierContact[];
  status: SupplierStatus;
}

export type SupplierInput = Partial<Omit<Supplier, 'id'>>;

export const suppliersApi = crudApi<Supplier, SupplierInput>('/suppliers');

// What a supplier sells: their code for a variant, last cost, minimum order quantity
export interface SupplierProduct {
  id: string;
  supplierId: string;
  variantId: string;
  supplierSku: string | null;
  lastCost: number | null;
  minOrderQty: number | null;
  isPreferred: boolean;
  sku: string;
  productName: string;
  variantCost: number | null;
}

export interface SupplierProductInput {
  variantId: string;
  supplierSku?: string | null;
  lastCost?: number | null;
  minOrderQty?: number | null;
  isPreferred?: boolean;
}

export const supplierProductsApi = {
  list: async (supplierId: string): Promise<SupplierProduct[]> => {
    const { data } = await apiClient.get(`/suppliers/${supplierId}/products`);
    return data;
  },
  // Replaces the whole list
  save: async (supplierId: string, items: SupplierProductInput[]): Promise<SupplierProduct[]> => {
    const { data } = await apiClient.put(`/suppliers/${supplierId}/products`, { items });
    return data;
  },
};

// ---- Purchase orders ----

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  quantityOrdered: number;
  // Into stock (good + accepted damaged); may exceed ordered within the tolerance
  quantityReceived: number;
  // No longer expected (short-close)
  quantityCancelled?: number;
  // Before the line discount
  unitCost: number;
  discountPercent?: number;
  discountAmount?: number;
  taxAmount?: number;
  unitOfMeasure?: string | null;
  supplierSku?: string | null;
  // Net of the discount, before tax
  subtotal: number;
  total: number;
  notes: string | null;
  lineNumber: number;
}

export type ReceiptCondition = 'good' | 'damaged';

export interface GoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string | null;
  variantId: string;
  quantity: number;
  unitCost: number;
  condition?: ReceiptCondition;
  // Damaged units put into stock (false: recorded only)
  accepted?: boolean;
  quantityReturned?: number;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  // Null for an unplanned receipt
  purchaseOrderId: string | null;
  supplierId?: string;
  locationId: string;
  idempotencyKey: string;
  receivedAt: string;
  reference: string | null;
  notes: string | null;
  totalCost: number;
  userId: string;
  overReceiptApprovedById?: string | null;
  items: GoodsReceiptItem[];
}

// Receipt with names, as listed for returns and invoices
export interface GoodsReceiptView extends GoodsReceipt {
  supplier?: Supplier;
  purchaseOrder?: { id: string; poNumber: string; currencyCode: string } | null;
  items: (GoodsReceiptItem & { sku: string; productName: string; returnable: number })[];
}

export interface PurchaseOrderRevisionLine {
  variantId: string;
  sku: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  discountPercent: number;
  taxAmount: number;
  total: number;
  unitOfMeasure: string | null;
}

export interface PurchaseOrderRevision {
  id: string;
  revisionNumber: number;
  userId: string;
  reason: string | null;
  statusBefore: PurchaseOrderStatus;
  statusAfter: PurchaseOrderStatus;
  totalBefore: number;
  totalAfter: number;
  requiresApproval: boolean;
  rejectedAt: string | null;
  createdAt: string;
  before: { total: number; lines: PurchaseOrderRevisionLine[] };
  after: { total: number; lines: PurchaseOrderRevisionLine[] };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: Supplier;
  locationId: string;
  location?: { id: string; code: string; name: string | null; warehouseId: string };
  warehouse?: { id: string; name: string; addressLine1: string | null; city: string | null };
  orderDate: string;
  expectedDeliveryDate: string | null;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  currencyCode: string;
  userId: string;
  notes: string | null;
  status: PurchaseOrderStatus;
  submittedAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  discountAmount?: number;
  supplierReference?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  revisionNumber?: number;
  revisedById?: string | null;
  createdAt: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  items: PurchaseOrderItem[];
  receipts: GoodsReceipt[];
  revisions?: PurchaseOrderRevision[];
  createdByName: string | null;
  approvedByName: string | null;
  // userId → display name of everyone involved
  people: Record<string, string>;
}

export interface PurchaseOrderInput {
  supplierId: string;
  locationId: string;
  expectedDeliveryDate?: string | null;
  taxAmount?: number;
  shippingCost?: number;
  notes?: string | null;
  supplierReference?: string | null;
  items: {
    variantId: string;
    quantityOrdered: number;
    unitCost: number;
    discountPercent?: number;
    taxAmount?: number;
    unitOfMeasure?: string | null;
    supplierSku?: string | null;
    notes?: string;
  }[];
}

export interface ReceiveInput {
  // Generate once per receipt and reuse it on retries
  idempotencyKey: string;
  reference?: string;
  notes?: string;
  items: {
    purchaseOrderItemId: string;
    // Good units
    quantity: number;
    // Damaged units: into stock only when accepted
    damagedQuantity?: number;
    damagedAccepted?: boolean;
    unitCost?: number;
  }[];
}

export interface UnplannedReceiptInput {
  supplierId: string;
  locationId: string;
  idempotencyKey: string;
  reference?: string;
  notes?: string;
  items: { variantId: string; quantity: number; damagedQuantity?: number; damagedAccepted?: boolean; unitCost: number }[];
}

export const purchaseOrdersApi = {
  list: async (params?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    search?: string;
  }): Promise<PurchaseOrder[]> => {
    const { data } = await apiClient.get('/purchase-orders', { params });
    return data;
  },
  get: async (id: string): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.get(`/purchase-orders/${id}`);
    return data;
  },
  create: async (input: PurchaseOrderInput): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post('/purchase-orders', input);
    return data;
  },
  update: async (id: string, input: PurchaseOrderInput): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.put(`/purchase-orders/${id}`, input);
    return data;
  },
  submit: async (id: string): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/submit`, {});
    return data;
  },
  approve: async (id: string, headers?: Headers): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/approve`, {}, { headers });
    return data;
  },
  reject: async (id: string, reason?: string, headers?: Headers): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/reject`, { reason }, { headers });
    return data;
  },
  issue: async (id: string): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/issue`, {});
    return data;
  },
  cancel: async (id: string, reason?: string): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/cancel`, { reason });
    return data;
  },
  // Change an approved / issued order: recorded as a revision
  revise: async (id: string, input: PurchaseOrderInput & { reason: string }): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/revise`, input);
    return data;
  },
  // Close; on a partly received order the unreceived remainder is cancelled
  close: async (id: string, reason: string): Promise<PurchaseOrderDetail> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/close`, { reason });
    return data;
  },
  receive: async (
    id: string,
    input: ReceiveInput,
    headers?: Headers
  ): Promise<{ duplicate: boolean; receipt: GoodsReceipt; purchaseOrder: PurchaseOrder }> => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/receipts`, input, { headers });
    return data;
  },
};

// ---- Goods receipts ----

export const goodsReceiptsApi = {
  list: async (params?: { supplierId?: string; purchaseOrderId?: string; search?: string }): Promise<GoodsReceiptView[]> => {
    const { data } = await apiClient.get('/goods-receipts', { params });
    return data;
  },
  get: async (id: string): Promise<GoodsReceiptView> => {
    const { data } = await apiClient.get(`/goods-receipts/${id}`);
    return data;
  },
  // Receive from a supplier without a purchase order
  unplanned: async (input: UnplannedReceiptInput): Promise<{ duplicate: boolean; receipt: GoodsReceipt }> => {
    const { data } = await apiClient.post('/goods-receipts/unplanned', input);
    return data;
  },
};

// ---- Supplier returns ----

export interface SupplierReturn {
  id: string;
  returnNumber: string;
  supplierId: string;
  supplier?: Supplier;
  receiptId: string;
  receipt?: { id: string; receiptNumber: string };
  locationId: string;
  reason: string;
  reference: string | null;
  totalAmount: number;
  currencyCode: string;
  returnedAt: string;
  items: { id: string; receiptItemId: string; variantId: string; quantity: number; unitCost: number; total: number; sku?: string; productName?: string }[];
}

export interface SupplierReturnInput {
  receiptId: string;
  reason: string;
  reference?: string;
  items: { receiptItemId: string; quantity: number }[];
}

export const supplierReturnsApi = {
  list: async (params?: { supplierId?: string }): Promise<SupplierReturn[]> => {
    const { data } = await apiClient.get('/supplier-returns', { params });
    return data;
  },
  create: async (input: SupplierReturnInput): Promise<SupplierReturn> => {
    const { data } = await apiClient.post('/supplier-returns', input);
    return data;
  },
};

// ---- Supplier invoices ----

export type SupplierInvoiceStatus = 'pending_approval' | 'open' | 'void';
export type SupplierInvoiceType = 'standard' | 'opening_balance';

export interface SupplierInvoiceItem {
  id: string;
  lineNumber: number;
  purchaseOrderItemId: string | null;
  receiptItemId: string | null;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  // 3-way match (null when not matched to an order line)
  expectedUnitPrice: number | null;
  matchableQuantity: number | null;
  priceVariance: number;
  priceVariancePercent: number | null;
  quantityVariance: number;
  varianceFlag: boolean;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  invoiceNumber: string;
  invoiceType: SupplierInvoiceType;
  purchaseOrderId: string | null;
  purchaseOrder?: { id: string; poNumber: string } | null;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: SupplierInvoiceStatus;
  hasVariance: boolean;
  notes: string | null;
  userId: string;
  approvedAt: string | null;
  voidReason: string | null;
  // Derived from payment and credit allocations
  amountAllocated: number;
  amountOpen: number;
  overdue: boolean;
}

export interface SupplierInvoiceDetail extends SupplierInvoice {
  items: SupplierInvoiceItem[];
  allocations: {
    id: string;
    amount: number;
    createdAt: string;
    paymentNumber: string | null;
    creditNumber: string | null;
  }[];
  createdByName: string | null;
  approvedByName: string | null;
}

export interface SupplierInvoiceInput {
  supplierId: string;
  invoiceNumber: string;
  invoiceType?: SupplierInvoiceType;
  purchaseOrderId?: string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  // Opening balance only
  amount?: number;
  items?: {
    purchaseOrderItemId?: string;
    receiptItemId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxAmount?: number;
  }[];
}

export const supplierInvoicesApi = {
  list: async (params?: {
    supplierId?: string;
    status?: SupplierInvoiceStatus;
    purchaseOrderId?: string;
  }): Promise<SupplierInvoice[]> => {
    const { data } = await apiClient.get('/supplier-invoices', { params });
    return data;
  },
  get: async (id: string): Promise<SupplierInvoiceDetail> => {
    const { data } = await apiClient.get(`/supplier-invoices/${id}`);
    return data;
  },
  create: async (input: SupplierInvoiceInput): Promise<SupplierInvoiceDetail> => {
    const { data } = await apiClient.post('/supplier-invoices', input);
    return data;
  },
  approve: async (id: string, headers?: Headers): Promise<SupplierInvoiceDetail> => {
    const { data } = await apiClient.post(`/supplier-invoices/${id}/approve`, {}, { headers });
    return data;
  },
  void: async (id: string, reason: string): Promise<SupplierInvoiceDetail> => {
    const { data } = await apiClient.post(`/supplier-invoices/${id}/void`, { reason });
    return data;
  },
};

// ---- Credits and payments ----

export interface Allocation {
  invoiceId: string;
  amount: number;
}

export interface SupplierCredit {
  id: string;
  creditNumber: string;
  supplierId: string;
  supplier?: Supplier;
  creditType: 'return' | 'manual';
  returnId: string | null;
  creditDate: string;
  amount: number;
  currencyCode: string;
  reference: string | null;
  reason: string;
  status: 'open' | 'void';
  amountAllocated: number;
  amountUnallocated: number;
}

export type SupplierPaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card' | 'mobile_money' | 'other';

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplier?: Supplier;
  paymentDate: string;
  amount: number;
  currencyCode: string;
  // Paid in another currency: that currency, the amount in it and the rate used
  tenderedCurrency?: string | null;
  tenderedAmount?: number | string | null;
  exchangeRate?: number | string | null;
  method: SupplierPaymentMethod;
  reference: string | null;
  notes: string | null;
  status: 'posted' | 'void';
  voidReason: string | null;
  amountAllocated: number;
  amountUnallocated: number;
}

export interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  amountOpen: number;
}

export const supplierCreditsApi = {
  list: async (params?: { supplierId?: string }): Promise<SupplierCredit[]> => {
    const { data } = await apiClient.get('/supplier-credits', { params });
    return data;
  },
  create: async (input: {
    supplierId: string;
    amount: number;
    creditDate?: string;
    reference?: string;
    reason: string;
  }): Promise<SupplierCredit> => {
    const { data } = await apiClient.post('/supplier-credits', input);
    return data;
  },
  allocate: async (id: string, allocations: Allocation[]): Promise<SupplierCredit> => {
    const { data } = await apiClient.post(`/supplier-credits/${id}/allocations`, { allocations });
    return data;
  },
  void: async (id: string, reason: string): Promise<SupplierCredit> => {
    const { data } = await apiClient.post(`/supplier-credits/${id}/void`, { reason });
    return data;
  },
};

export const supplierPaymentsApi = {
  list: async (params?: { supplierId?: string }): Promise<SupplierPayment[]> => {
    const { data } = await apiClient.get('/supplier-payments', { params });
    return data;
  },
  create: async (input: {
    supplierId: string;
    // In the supplier's currency
    amount: number;
    // Paid in another currency (e.g. HTG): the server converts it (sell / buy rate)
    currencyCode?: string;
    tenderedAmount?: number;
    method: SupplierPaymentMethod;
    paymentDate?: string;
    reference?: string;
    notes?: string;
    allocations?: Allocation[];
  }): Promise<SupplierPayment> => {
    const { data } = await apiClient.post('/supplier-payments', input);
    return data;
  },
  allocate: async (id: string, allocations: Allocation[]): Promise<SupplierPayment> => {
    const { data } = await apiClient.post(`/supplier-payments/${id}/allocations`, { allocations });
    return data;
  },
  void: async (id: string, reason: string): Promise<SupplierPayment> => {
    const { data } = await apiClient.post(`/supplier-payments/${id}/void`, { reason });
    return data;
  },
};

// ---- Payables: aging and statements (derived, never edited) ----

export interface SupplierAging {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  currencyCode: string | null;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  // Payments and credits not allocated to an invoice
  unapplied: number;
  balance: number;
}

export interface StatementLine {
  date: string;
  type: 'invoice' | 'credit' | 'payment';
  id: string;
  number: string;
  description: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
}

export interface SupplierStatement {
  supplier: { id: string; code: string; name: string; currencyCode: string | null; paymentTermDays: number | null };
  from: string;
  to: string;
  openingBalance: number;
  lines: StatementLine[];
  closingBalance: number;
  aging: SupplierAging | null;
}

export const payablesApi = {
  aging: async (asOf?: string): Promise<{ asOf: string; suppliers: SupplierAging[] }> => {
    const { data } = await apiClient.get('/payables/aging', { params: { asOf } });
    return data;
  },
  statement: async (supplierId: string, params?: { from?: string; to?: string }): Promise<SupplierStatement> => {
    const { data } = await apiClient.get(`/suppliers/${supplierId}/statement`, { params });
    return data;
  },
  openInvoices: async (supplierId: string): Promise<OpenInvoice[]> => {
    const { data } = await apiClient.get(`/suppliers/${supplierId}/open-invoices`);
    return data;
  },
};

// ---- Reorder suggestions ----

export interface ReorderLine {
  variantId: string;
  sku: string;
  productName: string;
  onHand: number;
  onOrder: number;
  reorderPoint: number;
  reorderQuantity: number | null;
  maxStockLevel: number | null;
  suggestedQuantity: number;
  unitCost: number | null;
  supplierSku: string | null;
  minOrderQty: number | null;
}

export interface ReorderGroup {
  supplier: { id: string; code: string; name: string; currencyCode: string | null; leadTimeDays: number | null } | null;
  lines: ReorderLine[];
  estimatedTotal: number;
}

export const reorderApi = {
  suggestions: async (params?: { locationId?: string; supplierId?: string }): Promise<{ locationId: string | null; groups: ReorderGroup[] }> => {
    const { data } = await apiClient.get('/purchasing/reorder-suggestions', { params });
    return data;
  },
};
