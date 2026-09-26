import apiClient from './client';

export type ImportAction = 'create' | 'update' | 'skip' | 'error';

/** What happens to products that already exist (matched on SKU) */
export interface ImportPolicy {
  onExisting: 'skip' | 'update';
  // Overwrite prices/costs of existing products (never by default)
  updatePrices: boolean;
}

export const DEFAULT_IMPORT_POLICY: ImportPolicy = { onExisting: 'update', updatePrices: false };

/** A price/cost in the file that differs from the existing product */
export interface ImportPriceChange {
  field: 'price' | 'cost';
  from: number | null;
  to: number;
  // False: the current value is kept
  applied: boolean;
}

export interface ImportRow {
  line: number;
  sku: string;
  name: string | null;
  action: ImportAction;
  errors: string[];
  // Fields an update would change
  changes: string[];
  priceChanges: ImportPriceChange[];
}

export interface ImportPreview {
  totalRows: number;
  policy: ImportPolicy;
  summary: Record<ImportAction, number>;
  unknownColumns: string[];
  rows: ImportRow[];
}

export interface ImportResult {
  policy: ImportPolicy;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  batches: number;
  error: string | null;
  rows: ImportRow[];
}

export const MAX_IMPORT_MB = 2;
export const MAX_IMPORT_ROWS = 5000;

const policyFields = (policy: ImportPolicy) => ({
  onExisting: policy.onExisting,
  updatePrices: String(policy.updatePrices),
});

const csvForm = (file: File, extra: Record<string, string> = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(extra).forEach(([key, value]) => form.append(key, value));
  return form;
};

export const importsApi = {
  // CSV template with the header and example rows
  template: async (): Promise<Blob> => {
    const { data } = await apiClient.get('/imports/products/template', { responseType: 'blob' });
    return data;
  },
  // Dry run: validates every row, saves nothing
  preview: async (file: File, policy: ImportPolicy = DEFAULT_IMPORT_POLICY): Promise<ImportPreview> => {
    const { data } = await apiClient.post('/imports/products/preview', csvForm(file, policyFields(policy)), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  apply: async (
    file: File,
    skipInvalid: boolean,
    policy: ImportPolicy = DEFAULT_IMPORT_POLICY
  ): Promise<ImportResult> => {
    const { data } = await apiClient.post(
      '/imports/products/apply',
      csvForm(file, { skipInvalid: String(skipInvalid), ...policyFields(policy) }),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};
