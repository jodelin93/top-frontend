import apiClient, { withIdempotencyKey } from './client';
import type { Paginated } from './sales';

// Gift cards and store credit (a liability, not revenue). A gift card's full code is
// never stored: only its last 4 characters are shown after the sale that issued it.
export interface StoredValueAccount {
  id: string;
  accountType: 'gift_card' | 'store_credit';
  last4: string | null;
  customerId: string | null;
  balance: number;
  initialAmount: number;
  currencyCode: string;
  status: 'pending' | 'active' | 'void';
  expiresAt: string | null;
  saleId: string | null;
  createdAt: string;
  customer?: { id: string; code: string; firstName: string | null; lastName: string | null; companyName: string | null } | null;
}

export interface StoredValueEntry {
  id: string;
  createdAt: string;
  type: 'issue' | 'redeem' | 'refund_credit' | 'reversal' | 'adjustment' | 'expire';
  amount: number;
  balanceAfter: number;
  saleId: string | null;
  returnId: string | null;
  note: string | null;
}

// Special tenders, recognised by their code (created by the server on first use)
export const ON_ACCOUNT_CODE = 'ON_ACCOUNT';
export const GIFT_CARD_CODE = 'GIFT_CARD';
export const STORE_CREDIT_CODE = 'STORE_CREDIT';
export const EXCHANGE_CREDIT_CODE = 'EXCHANGE_CREDIT';
// None of them works offline (each needs a live balance / credit check)
export const ONLINE_ONLY_TENDERS = [ON_ACCOUNT_CODE, GIFT_CARD_CODE, STORE_CREDIT_CODE, EXCHANGE_CREDIT_CODE];
export const isOnlineOnlyTender = (method?: { code: string } | null) => !!method && ONLINE_ONLY_TENDERS.includes(method.code);

export const storedValueApi = {
  // Balance of a gift card by its code (rate-limited on the server)
  lookupGiftCard: async (code: string): Promise<StoredValueAccount> => {
    const { data } = await apiClient.get('/stored-value/gift-cards/lookup', { params: { code } });
    return data;
  },
  storeCredit: async (customerId: string): Promise<StoredValueAccount | null> => {
    const { data } = await apiClient.get(`/stored-value/customers/${customerId}`);
    return data.account ?? null;
  },
  creditCustomer: async (
    customerId: string,
    input: { amount: number; reason: string },
    idempotencyKey?: string,
    // Manager approval (X-Approval-Token): large credits need a second person
    headers?: Record<string, string>
  ): Promise<{ account: StoredValueAccount; entries: StoredValueEntry[] }> => {
    const { data } = await apiClient.post(`/stored-value/customers/${customerId}/credit`, input, {
      headers: withIdempotencyKey(idempotencyKey, headers),
    });
    return data;
  },
  list: async (params: {
    type?: 'gift_card' | 'store_credit';
    status?: 'pending' | 'active' | 'void';
    customerId?: string;
    last4?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<StoredValueAccount>> => {
    const { data } = await apiClient.get('/stored-value', { params });
    return data;
  },
  entries: async (id: string): Promise<{ account: StoredValueAccount; entries: StoredValueEntry[] }> => {
    const { data } = await apiClient.get(`/stored-value/${id}`);
    return data;
  },
  adjust: async (
    id: string,
    input: { amount: number; reason: string },
    idempotencyKey?: string,
    // Manager approval (X-Approval-Token): large credits need a second person
    headers?: Record<string, string>
  ): Promise<{ account: StoredValueAccount; entries: StoredValueEntry[] }> => {
    const { data } = await apiClient.post(`/stored-value/${id}/adjust`, input, {
      headers: withIdempotencyKey(idempotencyKey, headers),
    });
    return data;
  },
};
