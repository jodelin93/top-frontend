import apiClient from './client';
import type { Paginated, Sale } from './sales';
import type { PaymentMethod } from './settings';

export type ReturnStatus = 'completed' | 'refund_pending' | 'refund_failed';
// damaged: kept, at the damaged / quarantine location (never sold again as new)
export type ReturnDisposition = 'restock' | 'damaged' | 'dispose';
// goodwill: money back without goods; exchange: goods back and a replacement sale
export type ReturnType = 'return' | 'goodwill' | 'exchange';

export interface ReturnItem {
  id: string;
  saleItemId: string;
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
  disposition: ReturnDisposition;
  locationId: string | null;
  reason: string | null;
}

export interface ReturnRefund {
  id: string;
  paymentMethodId: string;
  originalPaymentId: string | null;
  amount: number;
  // Cash paid in another currency goes back in it, at the original payment's rate
  tenderedCurrency?: string | null;
  tenderedAmount?: number | string | null;
  exchangeRate?: number | string | null;
  provider: string | null;
  status: 'pending' | 'completed' | 'failed';
  failureReason: string | null;
  paymentMethod?: PaymentMethod;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  registerId: string;
  shiftId: string | null;
  customerId: string | null;
  userId: string;
  approverId: string | null;
  reason: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  status: ReturnStatus;
  returnType?: ReturnType;
  createdAt: string;
  items?: ReturnItem[];
  refunds?: ReturnRefund[];
  originalSale?: Sale;
}

export interface ReturnableLine {
  saleItemId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  quantitySold: number;
  quantityReturned: number;
  quantityReturnable: number;
  unitPrice: number;
  refundPerUnit: number;
  // Measured (weighed) line: decimals allowed up to unitPrecision
  unit?: string | null;
  unitPrecision?: number | null;
}

export interface SaleLookup {
  sale: Sale;
  returnable: boolean;
  outsideReturnWindow: boolean;
  returnWindowDays: number;
  lines: ReturnableLine[];
  previousReturns: SaleReturn[];
}

export interface CreateReturnInput {
  saleId: string;
  registerId: string;
  reason: string;
  items: { saleItemId: string; quantity: number; disposition: ReturnDisposition; locationId?: string; reason?: string }[];
  refunds?: { paymentMethodId: string; amount: number }[];
  // Refund everything with this one method (server uses the exact total)
  refundMethodId?: string;
  // Refund everything as the customer's store credit (customerId when the sale had none)
  refundToStoreCredit?: boolean;
  customerId?: string;
  // Goodwill refund: no items, this amount (sales.refund.goodwill or a manager's approval)
  type?: 'return' | 'goodwill';
  goodwillAmount?: number;
  // Required: one per return attempt, reused on retries (same key + same request →
  // the original return; same key + different request → 409)
  idempotencyKey: string;
}

export type ExchangeStatus = 'pending' | 'completed' | 'incomplete' | 'cancelled';

export interface ExchangeLink {
  id: string;
  createdAt: string;
  originalSaleId: string;
  returnId: string;
  newSaleId: string | null;
  status: ExchangeStatus;
  returnTotal: number;
  creditAmount: number;
  newSaleTotal: number;
  // + the customer paid the difference, − it was refunded
  difference: number;
  failureReason: string | null;
  saleReturn?: SaleReturn;
}

// The replacement sale of an exchange
export interface ExchangeSaleInput {
  customerId?: string;
  items: { variantId: string; quantity: number; discountPercent?: number }[];
  // Tenders for the difference when the new items cost more
  payments: { paymentMethodId: string; amount: number; reference?: string; giftCardCode?: string }[];
  // Pay whatever is left with this method (the server works out the exact amount)
  differenceMethodId?: string;
  // Replacement worth less than the credit: refund the rest with this method, or to
  // store credit (default: the original payments)
  creditRefundMethodId?: string;
  creditToStoreCredit?: boolean;
  notes?: string;
}

export interface ExchangeResult {
  exchange: ExchangeLink;
  saleReturn: SaleReturn;
  sale: Sale | null;
  // Why the replacement sale failed (the return stands; complete the exchange later)
  error: string | null;
}

export const exchangesApi = {
  list: async (params: { status?: ExchangeStatus; page?: number; limit?: number }): Promise<Paginated<ExchangeLink>> => {
    const { data } = await apiClient.get('/returns/exchanges', { params });
    return data;
  },
  get: async (id: string): Promise<ExchangeResult> => {
    const { data } = await apiClient.get(`/returns/exchanges/${id}`);
    return data;
  },
  // Same idempotency key again: the return is not repeated, only the sale is retried
  create: async (
    input: {
      saleId: string;
      registerId: string;
      reason: string;
      items: CreateReturnInput['items'];
      refundMethodId?: string;
      refundToStoreCredit?: boolean;
      newSale: ExchangeSaleInput;
      idempotencyKey: string;
    },
    headers?: Record<string, string>
  ): Promise<ExchangeResult> => {
    const { data } = await apiClient.post('/returns/exchanges', input, { headers });
    return data;
  },
  complete: async (
    id: string,
    input: { registerId: string; newSale: ExchangeSaleInput },
    headers?: Record<string, string>
  ): Promise<ExchangeResult> => {
    const { data } = await apiClient.post(`/returns/exchanges/${id}/complete`, input, { headers });
    return data;
  },
  // Give up an incomplete exchange: its whole credit is refunded (default: the original payments)
  cancel: async (
    id: string,
    input: { registerId: string; reason: string; refundMethodId?: string; refundToStoreCredit?: boolean },
    headers?: Record<string, string>
  ): Promise<ExchangeResult> => {
    const { data } = await apiClient.post(`/returns/exchanges/${id}/cancel`, input, { headers });
    return data;
  },
};

export const returnsApi = {
  list: async (params: {
    from?: string;
    to?: string;
    status?: ReturnStatus;
    returnType?: ReturnType;
    saleId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<SaleReturn>> => {
    const { data } = await apiClient.get('/returns', { params });
    return data;
  },
  get: async (id: string): Promise<SaleReturn> => {
    const { data } = await apiClient.get(`/returns/${id}`);
    return data;
  },
  lookup: async (saleNumber: string, headers?: Record<string, string>): Promise<SaleLookup> => {
    const { data } = await apiClient.get('/returns/lookup', { params: { saleNumber }, headers });
    return data;
  },
  // headers: X-Approval-Token from a manager (no refund permission, outside the return window,
  // or a refund to another payment method than the sale was paid with); several are comma-separated
  create: async (input: CreateReturnInput, headers?: Record<string, string>): Promise<SaleReturn> => {
    const { data } = await apiClient.post('/returns', input, { headers });
    return data;
  },
  retryRefunds: async (id: string): Promise<SaleReturn> => {
    const { data } = await apiClient.post(`/returns/${id}/retry-refunds`);
    return data;
  },
};
