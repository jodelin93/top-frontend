import apiClient from './client';
import type { Paginated, PaymentStatus, SaleStatus } from './sales';
import type { PaymentMethod } from './settings';

export interface PaymentProviderInfo {
  name: string;
  label: string;
  // true: authorised asynchronously (the sale waits in payment_pending)
  async: boolean;
}

// Payment methods carry the provider adapter they use ('manual' by default)
export type PaymentMethodWithProvider = PaymentMethod & { provider?: string };

export interface SalePaymentState {
  saleId: string;
  saleNumber: string;
  saleStatus: SaleStatus;
  state: 'settled' | 'failed' | 'open';
  payments: {
    id: string;
    amount: number;
    status: PaymentStatus;
    provider: string | null;
    providerReference: string | null;
    failureReason: string | null;
    methodName: string | null;
  }[];
}

export interface SettlementBatch {
  id: string;
  createdAt: string;
  provider: string;
  reference: string | null;
  source: 'csv' | 'json';
  lineCount: number;
  matchedCount: number;
  totalAmount: number;
  totalFees: number;
}

export interface SettlementLineRow {
  id: string;
  batchId: string;
  provider: string;
  batchReference: string | null;
  reference: string;
  amount: number;
  fee: number;
  settledDate: string | null;
  status: 'matched' | 'unmatched' | 'resolved';
  paymentId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  saleId: string | null;
  saleNumber: string | null;
}

export interface UnreconciledPayment {
  id: string;
  amount: number;
  reference: string | null;
  providerReference: string | null;
  provider: string;
  paymentDate: string;
  saleId: string;
  saleNumber: string;
  methodName: Record<string, string> | null;
}

export interface SettlementLineInput {
  reference?: string;
  amount: number;
  fee?: number;
  date?: string;
}

export const paymentsApi = {
  providers: async (): Promise<PaymentProviderInfo[]> => {
    const { data } = await apiClient.get('/payments/providers');
    return data;
  },
  setMethodProvider: async (methodId: string, provider: string): Promise<PaymentMethodWithProvider> => {
    const { data } = await apiClient.patch(`/payments/methods/${methodId}/provider`, { provider });
    return data;
  },
  // Polled by the POS while a sale waits for its card payment
  saleState: async (saleId: string): Promise<SalePaymentState> => {
    const { data } = await apiClient.get(`/payments/sales/${saleId}`);
    return data;
  },
  lookup: async (paymentId: string): Promise<SalePaymentState> => {
    const { data } = await apiClient.post(`/payments/${paymentId}/lookup`);
    return data;
  },
  retry: async (paymentId: string): Promise<SalePaymentState> => {
    const { data } = await apiClient.post(`/payments/${paymentId}/retry`);
    return data;
  },

  // ---- Settlement reconciliation ----
  importSettlement: async (input: {
    provider: string;
    reference?: string;
    lines: SettlementLineInput[];
  }): Promise<SettlementBatch & { lines: SettlementLineRow[] }> => {
    const { data } = await apiClient.post('/payments/settlements', input);
    return data;
  },
  uploadSettlement: async (
    file: File,
    fields: { provider: string; reference?: string }
  ): Promise<SettlementBatch & { lines: SettlementLineRow[] }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('provider', fields.provider);
    if (fields.reference) form.append('reference', fields.reference);
    const { data } = await apiClient.post('/payments/settlements/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  batches: async (params: { page?: number; limit?: number } = {}): Promise<Paginated<SettlementBatch>> => {
    const { data } = await apiClient.get('/payments/settlements', { params });
    return data;
  },
  batch: async (id: string): Promise<SettlementBatch & { lines: SettlementLineRow[] }> => {
    const { data } = await apiClient.get(`/payments/settlements/${id}`);
    return data;
  },
  unmatched: async (
    provider?: string
  ): Promise<{ lines: SettlementLineRow[]; payments: UnreconciledPayment[] }> => {
    const { data } = await apiClient.get('/payments/reconciliation/unmatched', {
      params: { provider: provider || undefined },
    });
    return data;
  },
  resolveLine: async (lineId: string, input: { note: string; paymentId?: string }) => {
    const { data } = await apiClient.post(`/payments/settlements/lines/${lineId}/resolve`, input);
    return data as { ok: true };
  },
  resolvePayment: async (paymentId: string, note: string) => {
    const { data } = await apiClient.post(`/payments/${paymentId}/reconcile`, { note });
    return data as { ok: true };
  },
};
