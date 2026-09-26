import apiClient from './client';
import { crudApi } from './crud';

export type CustomFieldValue = string | number | boolean;

export interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  // Stored for the POS; not applied to prices yet
  priceListId: string | null;
  discountPercent: number;
  isActive: boolean;
  // Payment terms (days) of members' sales on account, unless set on the customer
  defaultPaymentTermDays?: number | null;
  // Optimistic concurrency (sent back as If-Match when editing)
  version?: number;
}

export interface Customer {
  id: string;
  code: string;
  customerType: 'individual' | 'business';
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  // Personal details: only for users with customers.manage or customers.finance.view
  // (left out of the response otherwise, like metadata.address)
  taxNumber?: string | null;
  dateOfBirth?: string | null;
  // Only for users with customers.finance.view (left out of the response otherwise)
  creditLimit?: number;
  currentBalance?: number;
  // Days to pay a sale on account (null: the group's terms, else 30)
  paymentTermDays?: number | null;
  // No new sales on account while set
  creditHold?: boolean;
  loyaltyPoints: number;
  status: 'active' | 'inactive' | 'blocked';
  lastPurchaseAt: string | null;
  createdAt: string;
  groupId?: string | null;
  group?: CustomerGroup | null;
  marketingEmailConsent?: boolean;
  marketingSmsConsent?: boolean;
  consentUpdatedAt?: string | null;
  consentSource?: string | null;
  // Set when this record was merged into another customer
  mergedIntoId?: string | null;
  // Custom field values live in metadata.customFields; anonymisedAt once anonymised
  metadata?: { customFields?: Record<string, CustomFieldValue>; anonymisedAt?: string } & Record<string, unknown>;
}

export interface CustomerInput {
  code?: string;
  customerType?: Customer['customerType'];
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  dateOfBirth?: string | null;
  creditLimit?: number;
  paymentTermDays?: number | null;
  creditHold?: boolean;
  status?: Customer['status'];
  groupId?: string | null;
  marketingEmailConsent?: boolean;
  marketingSmsConsent?: boolean;
  consentSource?: string;
  customFields?: Record<string, CustomFieldValue | null>;
}

export type CustomerFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomerFieldDefinition {
  id: string;
  key: string;
  label: string;
  fieldType: CustomerFieldType;
  isRequired: boolean;
  options: string[] | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ConsentEvent {
  id: string;
  createdAt: string;
  channel: 'email' | 'sms';
  granted: boolean;
  source: string | null;
  note: string | null;
  recordedById: string | null;
}

export type DuplicateReason = 'email' | 'phone' | 'name';

export interface DuplicatePair {
  a: Customer;
  b: Customer;
  reasons: DuplicateReason[];
  score: number;
}

export interface DuplicateCandidate {
  customer: Customer;
  reasons: DuplicateReason[];
}

export const MERGE_FIELDS = [
  ['customerType', 'Type'],
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['companyName', 'Company'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['taxNumber', 'Tax number'],
  ['dateOfBirth', 'Date of birth'],
  ['groupId', 'Group'],
  ['creditLimit', 'Credit limit'],
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number][0];
export type MergeChoices = Partial<Record<MergeField, 'survivor' | 'merged'>>;

export const customerName = (c: Pick<Customer, 'firstName' | 'lastName' | 'companyName' | 'code'>) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.code;

export const customersApi = {
  ...crudApi<Customer, CustomerInput>('/customers'),

  // Likely duplicates of the given details (warning while creating a customer)
  duplicateCheck: async (params: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    excludeId?: string;
  }): Promise<DuplicateCandidate[]> => {
    const { data } = await apiClient.get('/customers/duplicate-check', { params });
    return data;
  },
  duplicates: async (limit = 50): Promise<DuplicatePair[]> => {
    const { data } = await apiClient.get('/customers/duplicates', { params: { limit } });
    return data;
  },
  merge: async (input: {
    survivorId: string;
    mergedId: string;
    choices?: MergeChoices;
  }): Promise<{ survivor: Customer; merged: Customer; moved: Record<string, number> }> => {
    const { data } = await apiClient.post('/customers/merge', input);
    return data;
  },
  consentEvents: async (id: string): Promise<ConsentEvent[]> => {
    const { data } = await apiClient.get(`/customers/${id}/consent-events`);
    return data;
  },
  mergedRecords: async (id: string): Promise<Customer[]> => {
    const { data } = await apiClient.get(`/customers/${id}/merged-records`);
    return data;
  },
  // Erase the customer's personal data (keeps the record and its sales); 409 while money is owed
  anonymize: async (id: string): Promise<{ id: string; anonymisedAt: string }> => {
    const { data } = await apiClient.post(`/customers/${id}/anonymize`);
    return data;
  },
};

// ---- Addresses, contacts, internal notes, activity ----

export interface CustomerAddress {
  id: string;
  addressType: 'billing' | 'shipping';
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isDefault: boolean;
}

export type CustomerAddressInput = Omit<CustomerAddress, 'id' | 'isDefault'> & { isDefault?: boolean };

export interface CustomerContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export type CustomerContactInput = Omit<CustomerContact, 'id' | 'isPrimary'> & { isPrimary?: boolean };

export interface CustomerNote {
  id: string;
  createdAt: string;
  body: string;
  // 'managers': only users with customers.manage see it
  visibility: 'all' | 'managers';
  createdById: string | null;
}

export interface CustomerActivity {
  kind: 'sale' | 'return' | 'credit' | 'loyalty' | 'note' | 'store_credit';
  id: string;
  date: string;
  // English label from the server (status, entry type...)
  label: string;
  reference: string | null;
  amount: number | null;
  detail: string | null;
}

export const customerProfileApi = {
  addresses: async (customerId: string): Promise<CustomerAddress[]> => {
    const { data } = await apiClient.get(`/customers/${customerId}/addresses`);
    return data;
  },
  addAddress: async (customerId: string, input: CustomerAddressInput): Promise<CustomerAddress> => {
    const { data } = await apiClient.post(`/customers/${customerId}/addresses`, input);
    return data;
  },
  updateAddress: async (
    customerId: string,
    id: string,
    input: Partial<CustomerAddressInput>
  ): Promise<CustomerAddress> => {
    const { data } = await apiClient.patch(`/customers/${customerId}/addresses/${id}`, input);
    return data;
  },
  removeAddress: async (customerId: string, id: string): Promise<void> => {
    await apiClient.delete(`/customers/${customerId}/addresses/${id}`);
  },
  contacts: async (customerId: string): Promise<CustomerContact[]> => {
    const { data } = await apiClient.get(`/customers/${customerId}/contacts`);
    return data;
  },
  addContact: async (customerId: string, input: CustomerContactInput): Promise<CustomerContact> => {
    const { data } = await apiClient.post(`/customers/${customerId}/contacts`, input);
    return data;
  },
  removeContact: async (customerId: string, id: string): Promise<void> => {
    await apiClient.delete(`/customers/${customerId}/contacts/${id}`);
  },
  notes: async (customerId: string): Promise<CustomerNote[]> => {
    const { data } = await apiClient.get(`/customers/${customerId}/notes`);
    return data;
  },
  addNote: async (customerId: string, input: { body: string; visibility: CustomerNote['visibility'] }): Promise<CustomerNote> => {
    const { data } = await apiClient.post(`/customers/${customerId}/notes`, input);
    return data;
  },
  removeNote: async (customerId: string, id: string): Promise<void> => {
    await apiClient.delete(`/customers/${customerId}/notes/${id}`);
  },
  activity: async (customerId: string): Promise<CustomerActivity[]> => {
    const { data } = await apiClient.get(`/customers/${customerId}/activity`);
    return data;
  },
};

export const customerGroupsApi = crudApi<CustomerGroup>('/customer-groups');
export const customerFieldsApi = crudApi<CustomerFieldDefinition>('/customer-fields');
