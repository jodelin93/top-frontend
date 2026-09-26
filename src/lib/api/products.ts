import apiClient from './client';
import { crudApi } from './crud';
import { downloadBlob } from './storage';

export type ProductType = 'simple' | 'variable' | 'composite';
export type ProductStatus = 'active' | 'inactive' | 'discontinued';

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: Record<string, string> | null;
  // Left out without inventory.cost.view
  cost?: number | null;
  price: number | null;
  compareAtPrice: number | null;
  stockQuantity: number;
  sortOrder: number;
  status: 'active' | 'inactive' | 'discontinued';
  // PLU / scale item code read from weighted and price-embedded barcodes
  pluCode?: string | null;
  imageUrl?: string | null;
  // Loaded on the product detail (GET /products/:id)
  attributeValues?: VariantAttributeValue[];
  barcodes?: ProductBarcode[];
}

export interface VariantAttributeValue {
  id: string;
  attributeId: string;
  value: string;
  attribute?: { id: string; code: string; name: Record<string, string> };
}

// Every barcode of a variant; the primary one mirrors variant.barcode
export interface ProductBarcode {
  id: string;
  variantId: string;
  barcode: string;
  isPrimary: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  contentType: string | null;
  sizeBytes: number | null;
}

export type AttributeType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color';

export interface AttributeDefinition {
  id: string;
  code: string;
  name: Record<string, string>;
  attributeType: AttributeType;
  options: string[] | null;
  isRequired: boolean;
  isVariantDefining: boolean;
  sortOrder: number;
}

export interface AttributeInput {
  code?: string;
  name?: Record<string, string>;
  attributeType?: AttributeType;
  options?: string[] | null;
  isVariantDefining?: boolean;
  sortOrder?: number;
}

export interface AttributeSelection {
  attributeId: string;
  values: string[];
}

export interface GeneratedVariant {
  sku: string;
  name: string;
  attributes: { attributeId: string; attributeName: string; value: string }[];
  exists: boolean;
  variantId: string | null;
}

export interface GenerateVariantsResult {
  dryRun: boolean;
  combinations: GeneratedVariant[];
  toCreate: number;
  existing: number;
  created: ProductVariant[];
}

// Limits enforced by the API (shown in the UI)
export const MAX_IMAGE_MB = 5;
export const MAX_IMAGES_PER_PRODUCT = 10;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export interface VariantInput {
  sku?: string;
  barcode?: string | null;
  name?: Record<string, string> | null;
  cost?: number | null;
  price?: number | null;
  compareAtPrice?: number | null;
  status?: ProductVariant['status'];
}

export interface Product {
  id: string;
  sku: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  productType: ProductType;
  categoryId: string | null;
  brand: string | null;
  manufacturer: string | null;
  barcode: string | null;
  isSerialized: boolean;
  isBatchTracked: boolean;
  // Ignored by the API (D018: negative stock is never allowed)
  allowBackorder?: boolean;
  // False for services / non-stock items (no stock movements)
  isStockTracked?: boolean;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
  category: { id: string; name: Record<string, string> } | null;
  // Null: the store's default tax rate applies
  taxCategoryId?: string | null;
  taxCategory?: { id: string; code: string; name: Record<string, string>; taxRateId: string | null } | null;
  // Attribute values the variants were generated from
  variantAttributes?: AttributeSelection[] | null;
  // Set on list responses
  primaryImage?: ProductImage | null;
  // Normalized by the API (see normalizeTags)
  tags?: string[];
  // Unit of measure (null: sold by the piece)
  unitId?: string | null;
  // Branch assortment, only on GET /products/:id (empty: sold at every branch)
  branchIds?: string[];
}

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  productType?: ProductType;
  categoryId?: string;
  taxCategoryId?: string;
  // Comma-separated: products with any of these tags
  tags?: string;
  // Only products sold at this branch
  branchId?: string;
  unitId?: string;
}

// Fields accepted by POST /products and PATCH /products/:id.
// null clears an optional field on update.
export interface ProductInput {
  sku?: string;
  name?: Record<string, string>;
  description?: Record<string, string> | null;
  productType?: ProductType;
  categoryId?: string | null;
  taxCategoryId?: string | null;
  // Price and cost of the default variant (simple products)
  price?: number;
  cost?: number;
  brand?: string | null;
  manufacturer?: string | null;
  barcode?: string | null;
  // Simple products: PLU / scale item code of the default variant (1–6 digits); null clears it
  pluCode?: string | null;
  isSerialized?: boolean;
  // Ignored by the API (D018: negative stock is never allowed); not sent anymore
  allowBackorder?: boolean;
  isStockTracked?: boolean;
  tags?: string[];
  unitId?: string | null;
  // Replaces the branch assortment; [] = sold at every branch
  branchIds?: string[];
  minStockLevel?: number | null;
  reorderPoint?: number | null;
  status?: ProductStatus;
}

// ---- Units of measure: units that allow decimals make products measured items ----
export interface Unit {
  id: string;
  code: string;
  name: string;
  allowsDecimals: boolean;
  // Decimal places (0-4)
  precision: number;
  isActive: boolean;
  createdAt: string;
}

export interface UnitInput {
  code?: string;
  name?: string;
  allowsDecimals?: boolean;
  precision?: number;
  isActive?: boolean;
}

export const unitsApi = crudApi<Unit, UnitInput>('/units');

// ---- Shelf labels ----
export type LabelLanguage = 'en' | 'fr' | 'ht' | 'es';
export const MAX_LABEL_COPIES = 500;
export const MAX_LABELS = 1000;

// One entry per printed copy; never carries the cost
export interface Label {
  variantId: string;
  name: string;
  variantName: string | null;
  sku: string;
  // Barcode, else SKU
  code: string;
  price: number;
}

// ---- Barcodes ----
export type BarcodeFormat = 'ean8' | 'upca' | 'ean13' | 'gtin14' | 'other';

export interface BarcodeCheck {
  barcode: string | null;
  format: BarcodeFormat;
  checkDigitValid: boolean | null;
  warning: string | null;
}

// Same rules as the API: trim, drop inner whitespace, upper-case codes with letters
// (numeric codes keep their leading zeros); empty → null
export function normalizeBarcode(value: string | null | undefined): string | null {
  const code = (value ?? '').replace(/\s+/g, '');
  if (!code) return null;
  return /^\d+$/.test(code) ? code : code.toUpperCase();
}

const GS1_FORMATS: Record<number, BarcodeFormat> = { 8: 'ean8', 12: 'upca', 13: 'ean13', 14: 'gtin14' };

// GS1 mod-10 check digit of a numeric body (weights 3,1,3,1... from the rightmost digit)
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

// Client-side version of GET /products/barcode-check (instant feedback while typing).
// A wrong check digit is only a warning: the barcode is still saved.
export function checkBarcode(value: string | null | undefined): BarcodeCheck {
  const barcode = normalizeBarcode(value);
  const format: BarcodeFormat =
    (barcode && /^\d+$/.test(barcode) && GS1_FORMATS[barcode.length]) || 'other';
  if (!barcode || format === 'other') return { barcode, format: 'other', checkDigitValid: null, warning: null };
  const valid = gs1CheckDigit(barcode.slice(0, -1)) === Number(barcode.slice(-1));
  return {
    barcode,
    format,
    checkDigitValid: valid,
    // Same text as the API
    warning: valid ? null : `The check digit of this ${format.toUpperCase()} barcode is wrong: check it for a typo`,
  };
}

export const barcodeFormatLabels: Record<BarcodeFormat, string> = {
  ean8: 'EAN-8',
  upca: 'UPC-A',
  ean13: 'EAN-13',
  gtin14: 'GTIN-14',
  other: 'Other',
};

// ---- Tags ----
export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 50;

// Same rules as the API: trimmed, inner spaces collapsed, lower-case, unique,
// at most MAX_TAGS tags of MAX_TAG_LENGTH characters
export function normalizeTags(tags: string[] | string | null | undefined): string[] {
  const list = typeof tags === 'string' ? tags.split(',') : (tags ?? []);
  const result: string[] = [];
  for (const raw of list) {
    const tag = String(raw).trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (tag && !result.includes(tag)) result.push(tag);
    if (result.length === MAX_TAGS) break;
  }
  return result;
}

export const productsApi = {
  list: async (filters: ProductFilters = {}): Promise<Product[]> => {
    const { data } = await apiClient.get('/products', { params: filters });
    return data;
  },

  get: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },

  create: async (input: ProductInput): Promise<Product> => {
    const { data } = await apiClient.post('/products', input);
    return data;
  },

  update: async (id: string, input: ProductInput): Promise<Product> => {
    const { data } = await apiClient.patch(`/products/${id}`, input);
    return data;
  },

  // Soft delete: the backend marks the product as discontinued
  discontinue: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  createVariant: async (productId: string, input: VariantInput): Promise<ProductVariant> => {
    const { data } = await apiClient.post(`/products/${productId}/variants`, input);
    return data;
  },

  updateVariant: async (productId: string, variantId: string, input: VariantInput): Promise<ProductVariant> => {
    const { data } = await apiClient.patch(`/products/${productId}/variants/${variantId}`, input);
    return data;
  },

  discontinueVariant: async (productId: string, variantId: string): Promise<void> => {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  // Preview (dryRun) or create every combination of attribute values as variants
  generateVariants: async (
    productId: string,
    input: { attributes: AttributeSelection[]; dryRun?: boolean; price?: number; cost?: number }
  ): Promise<GenerateVariantsResult> => {
    const { data } = await apiClient.post(`/products/${productId}/variants/generate`, input);
    return data;
  },

  // Extra barcodes of a variant
  barcodes: async (productId: string, variantId: string): Promise<ProductBarcode[]> => {
    const { data } = await apiClient.get(`/products/${productId}/variants/${variantId}/barcodes`);
    return data;
  },
  addBarcode: async (productId: string, variantId: string, barcode: string): Promise<ProductBarcode> => {
    const { data } = await apiClient.post(`/products/${productId}/variants/${variantId}/barcodes`, { barcode });
    return data;
  },
  removeBarcode: async (productId: string, variantId: string, barcodeId: string): Promise<void> => {
    await apiClient.delete(`/products/${productId}/variants/${variantId}/barcodes/${barcodeId}`);
  },

  // Images (JPEG, PNG or WebP, up to MAX_IMAGE_MB each)
  images: async (productId: string): Promise<ProductImage[]> => {
    const { data } = await apiClient.get(`/products/${productId}/images`);
    return data;
  },
  uploadImage: async (productId: string, file: File, altText?: string): Promise<ProductImage> => {
    const form = new FormData();
    form.append('file', file);
    if (altText) form.append('altText', altText);
    const { data } = await apiClient.post(`/products/${productId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  updateImage: async (
    productId: string,
    imageId: string,
    input: { altText?: string | null; isPrimary?: boolean }
  ): Promise<ProductImage> => {
    const { data } = await apiClient.patch(`/products/${productId}/images/${imageId}`, input);
    return data;
  },
  reorderImages: async (productId: string, imageIds: string[]): Promise<ProductImage[]> => {
    const { data } = await apiClient.post(`/products/${productId}/images/reorder`, { imageIds });
    return data;
  },
  removeImage: async (productId: string, imageId: string): Promise<void> => {
    await apiClient.delete(`/products/${productId}/images/${imageId}`);
  },

  // Server-side barcode normalization and GS1 check digit
  barcodeCheck: async (code: string): Promise<BarcodeCheck> => {
    const { data } = await apiClient.get('/products/barcode-check', { params: { code } });
    return data;
  },

  // Shelf labels: one entry per copy (at most MAX_LABELS), never with the cost
  labels: async (
    items: { variantId: string; copies: number }[],
    language?: LabelLanguage
  ): Promise<Label[]> => {
    const { data } = await apiClient.post('/products/labels', { items, ...(language && { language }) });
    return data;
  },

  // Catalog export (same columns as the import template; cost only when the user may see it)
  export: async (format: 'csv' | 'xlsx'): Promise<void> => {
    const response = await apiClient.get('/imports/products/export', {
      params: { format },
      responseType: 'blob',
    });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const filename =
      /filename="?([^";]+)"?/.exec(disposition)?.[1] ??
      `products-${new Date().toISOString().slice(0, 10)}.${format}`;
    downloadBlob(response.data as Blob, filename);
  },
};

// Size, Colour, ... used to generate variants
export const attributesApi = crudApi<AttributeDefinition, AttributeInput>('/attributes');
