import apiClient from './client';
import type { CartDiscountInput, Paginated, Quote, SaleItemInput } from './sales';
import type { Customer } from './customers';
import type { PaymentMethod } from './settings';
import { t } from '@/i18n';

export type OrderStatus = 'open' | 'ready' | 'picked_up' | 'cancelled';

export interface OrderItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  catalogPrice: number;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  taxRate: number | null;
  taxAmount: number;
  total: number;
  note: string | null;
  lineNumber: number;
}

/** A deposit received for the order, or a deposit given back when it was cancelled */
export interface OrderPayment {
  id: string;
  createdAt: string;
  type: 'deposit' | 'refund';
  amount: number;
  paymentMethodId: string;
  paymentMethod?: PaymentMethod;
  reference: string | null;
  tenderedCurrency: string | null;
  tenderedAmount: number | null;
  exchangeRate: number | null;
  shiftId: string | null;
  userId: string;
  userName?: string | null;
  note: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  registerId: string;
  customerId: string;
  customer?: Customer | null;
  userId: string;
  status: OrderStatus;
  readyBy: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  // Deposits received minus deposits refunded
  paidAmount: number;
  balanceDue: number;
  currencyCode: string;
  cartDiscount: CartDiscountInput | null;
  groupDiscountPercent: number;
  notes: string | null;
  readyAt: string | null;
  saleId: string | null;
  saleNumber?: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  depositOutcome: 'refunded' | 'kept' | 'none' | null;
  createdAt: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
  branch?: { id: string; name: string; [key: string]: unknown } | null;
  register?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
  readyByName?: string | null;
  cancelledByName?: string | null;
  cancelApproverName?: string | null;
}

export interface OrderPaymentInput {
  paymentMethodId: string;
  amount: number;
  reference?: string;
  currencyCode?: string;
  tenderedAmount?: number;
}

export interface OrderQuoteInput {
  registerId: string;
  customerId: string;
  priceListId?: string;
  cartDiscount?: CartDiscountInput;
  items: SaleItemInput[];
}

export interface CreateOrderInput extends OrderQuoteInput {
  readyBy?: string;
  notes?: string;
  deposit?: OrderPaymentInput;
  idempotencyKey?: string;
}

type Headers = Record<string, string>;

export const ordersApi = {
  list: async (params: {
    status?: OrderStatus | 'active';
    search?: string;
    branchId?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Order>> => {
    const { data } = await apiClient.get('/orders', { params });
    return data;
  },
  get: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },
  // headers: X-Approval-Token for discounts / price changes above the user's rights
  quote: async (input: OrderQuoteInput, headers?: Headers): Promise<Quote> => {
    const { data } = await apiClient.post('/orders/quote', input, { headers });
    return data;
  },
  create: async (input: CreateOrderInput, headers?: Headers): Promise<Order> => {
    const { data } = await apiClient.post('/orders', input, { headers });
    return data;
  },
  addDeposit: async (
    id: string,
    input: OrderPaymentInput & { registerId: string; idempotencyKey?: string }
  ): Promise<Order> => {
    const { data } = await apiClient.post(`/orders/${id}/deposits`, input);
    return data;
  },
  setStatus: async (id: string, status: 'open' | 'ready'): Promise<Order> => {
    const { data } = await apiClient.post(`/orders/${id}/status`, { status });
    return data;
  },
  update: async (id: string, input: { readyBy?: string | null; notes?: string | null }): Promise<Order> => {
    const { data } = await apiClient.patch(`/orders/${id}`, input);
    return data;
  },
  // headers: X-Approval-Token from a manager when the user can't cancel orders
  cancel: async (
    id: string,
    input: { reason: string; deposits: 'refund' | 'keep'; refundMethodId?: string; registerId?: string; reference?: string },
    headers?: Headers
  ): Promise<Order> => {
    const { data } = await apiClient.post(`/orders/${id}/cancel`, input, { headers });
    return data;
  },
};

export const orderCustomerName = (order: Pick<Order, 'customer'>) =>
  order.customer
    ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') ||
      order.customer.companyName ||
      order.customer.code
    : t('Customer');

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'In preparation',
  ready: 'Ready',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
};

export const isActiveOrder = (order: Pick<Order, 'status'>) => order.status === 'open' || order.status === 'ready';
