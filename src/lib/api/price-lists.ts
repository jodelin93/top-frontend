import apiClient from './client';
import { crudApi, LocalizedText } from './crud';
import type { ProductVariant } from './products';

export type PriceListType = 'standard' | 'promotional' | 'wholesale' | 'member';

export interface PriceList {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText | null;
  priceListType: PriceListType;
  currencyCode: string;
  branchId: string | null;
  validFrom: string | null;
  validTo: string | null;
  priority: number;
  status: 'active' | 'inactive' | 'scheduled';
}

export interface PriceEntry {
  id: string;
  priceListId: string;
  variantId: string;
  price: number;
  compareAtPrice: number | null;
  minQuantity: number | null;
  variant?: ProductVariant & { product?: { id: string; name: LocalizedText; sku: string } };
}

export interface PriceEntryInput {
  variantId: string;
  price: number;
  compareAtPrice?: number | null;
  minQuantity?: number | null;
}

export const priceListsApi = {
  ...crudApi<PriceList>('/price-lists'),
  entries: async (id: string): Promise<PriceEntry[]> => {
    const { data } = await apiClient.get(`/price-lists/${id}/entries`);
    return data;
  },
  setEntries: async (id: string, entries: PriceEntryInput[]): Promise<PriceEntry[]> => {
    const { data } = await apiClient.put(`/price-lists/${id}/entries`, { entries });
    return data;
  },
  removeEntry: async (id: string, entryId: string): Promise<void> => {
    await apiClient.delete(`/price-lists/${id}/entries/${entryId}`);
  },
};
