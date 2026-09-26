import { crudApi, LocalizedText } from './crud';

export interface Category {
  id: string;
  code: string;
  name: LocalizedText;
  description: LocalizedText | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  // Optimistic concurrency (sent back as If-Match when editing)
  version?: number;
}

export const categoriesApi = crudApi<Category>('/categories');
