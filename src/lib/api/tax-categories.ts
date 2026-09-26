import { crudApi, LocalizedText } from './crud';

export interface TaxCategory {
  id: string;
  code: string;
  name: LocalizedText;
  description: string | null;
  // Null: products in this category are tax exempt
  taxRateId: string | null;
  taxRate?: { id: string; code: string; name: LocalizedText; rate: number; taxType: string } | null;
}

export interface TaxCategoryInput {
  code?: string;
  name?: LocalizedText;
  description?: string | null;
  taxRateId?: string | null;
}

export const taxCategoriesApi = crudApi<TaxCategory, TaxCategoryInput>('/tax-categories');
