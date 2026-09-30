import apiClient, { withIdempotencyKey } from './client';
import type { Paginated } from './sales';

// Customer account ledger (D019): every change to a balance is an entry
export type CreditEntryType = 'charge' | 'payment' | 'credit_note' | 'adjustment' | 'opening_balance' | 'reversal';

export interface CreditEntry {
  id: string;
  createdAt: string;
  type: CreditEntryType;
  // Signed: + the customer owes more
  amount: number;
  balanceAfter: number;
  saleId: string | null;
  returnId: string | null;
  paymentMethodId: string | null;
  paymentRef: string | null;
  dueDate: string | null;
  note: string | null;
}

export interface Aging {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total: number;
}

export const AGING_COLUMNS: [keyof Aging, string][] = [
  ['current', 'Current'],
  ['d1_30', '1–30 days'],
  ['d31_60', '31–60 days'],
  ['d61_90', '61–90 days'],
  ['d90_plus', '90+ days'],
];

export interface CustomerAccount {
  customerId: string;
  balance: number;
  // Sum of the ledger (equals the balance unless something is wrong)
  ledgerBalance: number;
  creditLimit: number;
  available: number;
  creditHold: boolean;
  paymentTermDays: number;
  aging: Aging;
}

export interface Statement {
  customer: {
    id: string;
    code: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  from: string;
  to: string;
  openingBalance: number;
  totalCharges: number;
  totalCredits: number;
  closingBalance: number;
  lines: {
    id: string;
    date: string;
    type: CreditEntryType;
    amount: number;
    balance: number;
    reference: string | null;
    note: string | null;
    dueDate: string | null;
  }[];
  aging: Aging;
}

export interface AgingRow {
  customerId: string;
  code: string;
  name: string;
  balance: number;
  creditLimit: number;
  creditHold: boolean;
  aging: Aging;
}

export const customerAccountsApi = {
  account: async (customerId: string): Promise<CustomerAccount> => {
    const { data } = await apiClient.get(`/customers/${customerId}/account`);
    return data;
  },
  entries: async (
    customerId: string,
    params: { from?: string; to?: string; page?: number; limit?: number } = {}
  ): Promise<Paginated<CreditEntry>> => {
    const { data } = await apiClient.get(`/customers/${customerId}/account/entries`, { params });
    return data;
  },
  statement: async (customerId: string, from: string, to: string): Promise<Statement> => {
    const { data } = await apiClient.get(`/customers/${customerId}/account/statement`, { params: { from, to } });
    return data;
  },
  // Cash payments go into the open shift of registerId
  receivePayment: async (
    customerId: string,
    input: {
      amount: number;
      // Paid in another accepted currency (e.g. HTG): the server values it at the sell rate
      currencyCode?: string;
      tenderedAmount?: number;
      paymentMethodId: string;
      reference?: string;
      registerId?: string;
      note?: string;
      idempotencyKey?: string;
    },
    headers?: Record<string, string>
    // The account (and the entry's balanceAfter) only for customers.finance.view
  ): Promise<{ entry: Omit<CreditEntry, 'balanceAfter'> & { balanceAfter?: number }; account?: CustomerAccount }> => {
    const { data } = await apiClient.post(`/customers/${customerId}/account/payments`, input, {
      headers: withIdempotencyKey(input.idempotencyKey, headers),
    });
    return data;
  },
  adjust: async (
    customerId: string,
    input: { amount: number; reason: string; type?: 'adjustment' | 'opening_balance' },
    idempotencyKey?: string,
    headers?: Record<string, string>
  ): Promise<CustomerAccount> => {
    const { data } = await apiClient.post(`/customers/${customerId}/account/adjustments`, input, {
      headers: withIdempotencyKey(idempotencyKey, headers),
    });
    return data;
  },
  aging: async (params: { asOf?: string; nonZero?: 'true' | 'false'; search?: string } = {}): Promise<{
    asOf: string;
    rows: AgingRow[];
    totals: Aging;
  }> => {
    const { data } = await apiClient.get('/customer-accounts/aging', { params });
    return data;
  },
};
