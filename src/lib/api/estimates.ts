import apiClient from './client';
import type { Paginated, CartDiscountInput } from './sales';
import type { Customer } from './customers';
import { t } from '@/i18n';

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';

export interface EstimateItem {
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

export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string | null;
  customerName: string | null;
  customer: Customer | null;
  branchId: string | null;
  userId: string;
  status: EstimateStatus;
  expired: boolean;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  cartDiscount: CartDiscountInput | null;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  convertedSaleId: string | null;
  createdAt: string;
  items?: EstimateItem[];
}

export interface EstimateInput {
  customerId?: string | null;
  customerName?: string | null;
  issueDate?: string;
  validUntil?: string;
  cartDiscount?: CartDiscountInput | null;
  notes?: string | null;
  terms?: string | null;
  items: { variantId: string; quantity: number; unitPrice?: number; discountPercent?: number; note?: string }[];
}

type Headers = Record<string, string>;

export const estimatesApi = {
  list: async (params: { search?: string; status?: EstimateStatus; customerId?: string; page?: number; limit?: number }): Promise<Paginated<Estimate>> => {
    const { data } = await apiClient.get('/estimates', { params });
    return data;
  },
  get: async (id: string): Promise<Estimate> => {
    const { data } = await apiClient.get(`/estimates/${id}`);
    return data;
  },
  // headers: X-Approval-Token when quoting below catalog price / above the discount limit
  create: async (input: EstimateInput, headers?: Headers): Promise<Estimate> => {
    const { data } = await apiClient.post('/estimates', input, { headers });
    return data;
  },
  update: async (id: string, input: Partial<EstimateInput>, headers?: Headers): Promise<Estimate> => {
    const { data } = await apiClient.patch(`/estimates/${id}`, input, { headers });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/estimates/${id}`);
  },
  action: async (id: string, action: 'send' | 'accept' | 'decline'): Promise<Estimate> => {
    const { data } = await apiClient.post(`/estimates/${id}/${action}`);
    return data;
  },
  duplicate: async (id: string, headers?: Headers): Promise<Estimate> => {
    const { data } = await apiClient.post(`/estimates/${id}/duplicate`, undefined, { headers });
    return data;
  },
};

export const estimateCustomerName = (e: Pick<Estimate, 'customer' | 'customerName'>) =>
  e.customer
    ? [e.customer.firstName, e.customer.lastName].filter(Boolean).join(' ') || e.customer.companyName || e.customer.code
    : (e.customerName ?? t('No customer'));
