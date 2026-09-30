import apiClient, { withIdempotencyKey } from './client';
import { crudApi } from './crud';
import type { Paginated } from './shifts';

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
export type ExpensePaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string | null;
  categoryName: string | null;
  amount: number;
  currencyCode: string;
  // Paid in another currency (e.g. HTG): the amount in it and the sell rate used
  tenderedCurrency?: string | null;
  tenderedAmount?: number | null;
  exchangeRate?: number | null;
  description: string;
  payee: string | null;
  receiptReference: string | null;
  paymentMethod: ExpensePaymentMethod;
  registerId: string | null;
  shiftId: string | null;
  status: ExpenseStatus;
  approvalRequired: boolean;
  notes: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  paidByName: string | null;
  paidAt: string | null;
  cashMovement?: { id: string; shiftId: string; amount: number } | null;
  replayed?: boolean;
}

export interface ExpenseInput {
  expenseDate?: string;
  categoryId?: string | null;
  amount: number;
  // Paid in another accepted currency (e.g. HTG): the server values it at the sell rate
  currencyCode?: string;
  tenderedAmount?: number;
  description: string;
  payee?: string | null;
  receiptReference?: string | null;
  paymentMethod?: ExpensePaymentMethod;
  registerId?: string | null;
  notes?: string | null;
}

export interface ExpenseListQuery {
  status?: ExpenseStatus;
  categoryId?: string;
  registerId?: string;
  shiftId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type Headers = Record<string, string>;

export const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank: 'Bank transfer',
  other: 'Other',
};

export const expenseCategoriesApi = crudApi<ExpenseCategory, Omit<ExpenseCategory, 'id'>>('/expense-categories');

export const expensesApi = {
  list: async (params?: ExpenseListQuery): Promise<Paginated<Expense>> => {
    const { data } = await apiClient.get('/expenses', { params });
    return data;
  },
  get: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.get(`/expenses/${id}`);
    return data;
  },
  // idempotencyKey: one per form, reused on retries (Idempotency-Key header)
  create: async (input: ExpenseInput & { submit?: boolean }, idempotencyKey?: string): Promise<Expense> => {
    const { data } = await apiClient.post('/expenses', input, { headers: withIdempotencyKey(idempotencyKey) });
    return data;
  },
  update: async (id: string, input: Partial<ExpenseInput>): Promise<Expense> => {
    const { data } = await apiClient.patch(`/expenses/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },
  submit: async (id: string): Promise<Expense> => {
    const { data } = await apiClient.post(`/expenses/${id}/submit`);
    return data;
  },
  approve: async (id: string, headers?: Headers): Promise<Expense> => {
    const { data } = await apiClient.post(`/expenses/${id}/approve`, undefined, { headers });
    return data;
  },
  reject: async (id: string, reason: string, headers?: Headers): Promise<Expense> => {
    const { data } = await apiClient.post(`/expenses/${id}/reject`, { reason }, { headers });
    return data;
  },
  pay: async (
    id: string,
    input: { registerId?: string; reference?: string },
    idempotencyKey?: string
  ): Promise<Expense> => {
    const { data } = await apiClient.post(`/expenses/${id}/pay`, input, { headers: withIdempotencyKey(idempotencyKey) });
    return data;
  },
};
