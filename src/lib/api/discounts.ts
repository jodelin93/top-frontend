import apiClient from './client';
import { crudApi, LocalizedText } from './crud';

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y';
export type DiscountScope = 'product' | 'category' | 'cart';

export interface Discount {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText | null;
  discountType: DiscountType;
  scope: DiscountScope;
  value: number | null;
  percentage: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  validFrom: string | null;
  validTo: string | null;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  excludedProductIds: string[];
  priority: number;
  status: 'active' | 'inactive' | 'scheduled' | 'expired';
}

export const discountsApi = {
  ...crudApi<Discount>('/discounts'),
  // Checks the code can be used right now (throws otherwise)
  lookup: async (code: string): Promise<Discount> => {
    const { data } = await apiClient.get(`/discounts/code/${encodeURIComponent(code)}`);
    return data;
  },
};
