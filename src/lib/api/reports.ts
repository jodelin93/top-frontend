import apiClient from './client';

/**
 * Sales figures in one currency (spec §14). Net sales never include tax:
 * gross sales − discounts − returns, all excluding tax.
 */
export interface CurrencyTotals {
  currencyCode: string;
  saleCount: number;
  // Quantity sold (decimals for measured items: 1.25 kg)
  itemsSold: number;
  // Sale lines (each weighing of a measured item is its own line); absent on older servers
  lineCount?: number;
  grossSales: number;
  discounts: number;
  returnCount: number;
  // Returns processed in the period, excluding tax
  returns: number;
  netSales: number;
  tax: number;
  returnTax: number;
  netTax: number;
  // Net sales / completed sales (fully returned sales still count as sales)
  averageOrderValue: number;
  salesInclTax: number;
  refundsInclTax: number;
  totalCollectedInclTax: number;
  // Only for users allowed to see costs (inventory.cost.view)
  costOfGoods?: number;
  grossProfit?: number;
  margin?: number | null;
}

// How complete the figures are: tills may still hold sales not uploaded yet
export interface DataFreshness {
  generatedAt: string;
  pendingSales: number;
  failedSales: number;
  devicesWithPendingSales: number;
  lastDeviceSyncAt: string | null;
  complete: boolean;
}

export interface CurrencyAmount {
  currencyCode: string;
  amount: number;
  count: number;
}

export interface ReportSummary {
  period: { from: string; to: string; timezone: string };
  // Branches the figures are limited to (null: every branch)
  branchIds: string[] | null;
  generatedAt: string;
  freshness: DataFreshness;
  // Stock value at cost (null without cost access)
  inventoryValue: number | null;
  // Open supplier balance per currency (null without payables access or for one branch)
  purchasingObligations: { currencyCode: string; balance: number }[] | null;
  // Approved / paid expenses dated in the period, per currency
  expenses: CurrencyAmount[];
  // Sum of the closed shifts' cash variances in the period, per currency
  cashVariance: CurrencyAmount[];
  // Gift cards sold in the period, per currency (stored value: not in sales). Absent on older servers
  giftCardsSold?: CurrencyAmount[];
  // Store currency: `totals`, byDay, topProducts and byCashier are in it
  currencyCode: string;
  costVisible: boolean;
  totals: CurrencyTotals & { voidedCount: number; lowStockCount: number };
  // Sales in other currencies, never added to `totals`
  otherCurrencies: CurrencyTotals[];
  // total: net sales excluding tax
  byDay: { date: string; saleCount: number; total: number }[];
  byPaymentMethod: {
    paymentMethodId: string;
    name: string;
    methodType: string;
    currencyCode: string;
    count: number;
    amount: number;
  }[];
  // revenue excludes tax
  topProducts: { variantId: string; productName: string; variantName: string | null; sku: string; quantity: number; revenue: number }[];
  // total: net sales excluding tax
  byCashier: { userId: string; name: string; email: string; saleCount: number; total: number }[];
}

export type ReportColumnType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime';

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
  total?: boolean;
  // Permission needed to see the column (the server drops it otherwise)
  requires?: string;
  // Values from a fixed set (statuses, movement types): shown translated
  translate?: boolean;
}

export interface ReportParameter {
  key: 'variantId' | 'locationId';
  label: string;
  required: boolean;
}

export interface ReportInfo {
  key: string;
  title: string;
  description: string;
  group: string;
  usesDateRange: boolean;
  // false: store-wide figures, no branch filter
  branchFilter: boolean;
  parameters: ReportParameter[];
  columns: ReportColumn[];
}

export interface ReportResult {
  key: string;
  title: string;
  description: string;
  period: { from: string | null; to: string | null; timezone: string };
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  totals: Record<string, number>;
  // Rows in several currencies: money columns have no total
  mixedCurrencies?: boolean;
  branchIds?: string[] | null;
  generatedAt?: string;
  freshness?: DataFreshness;
}

export interface ReconciliationTotals {
  currencyCode: string;
  saleCount: number;
  salesTotal: number;
  linesTotal: number;
  paymentsNet: number;
  returnsTotal: number;
  refundsPaid: number;
}

export interface ReconciliationResult {
  period: { from: string; to: string };
  branchIds?: string[] | null;
  generatedAt?: string;
  saleCount: number;
  // Per currency: amounts in different currencies are never added together
  totals: ReconciliationTotals[];
  passed: boolean;
  checks: {
    key: string;
    label: string;
    description: string;
    passed: boolean;
    issues: { reference: string; expected: number; actual: number; detail: string | null }[];
  }[];
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ReportParams = {
  from?: string;
  to?: string;
  timezone?: string;
  branchId?: string;
  variantId?: string;
  locationId?: string;
};
type RangeParams = ReportParams;

export type ExportStatus = 'queued' | 'running' | 'done' | 'failed' | 'expired';

export interface ExportJob {
  id: string;
  reportKey: string;
  params: ReportParams;
  format: ExportFormat;
  status: ExportStatus;
  rowCount: number | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  error: string | null;
  // GET /exports/:id when ready: a link valid for a few minutes
  downloadUrl?: string | null;
}

export interface SavedReportFilter {
  id: string;
  reportKey: string;
  name: string;
  // preset: relative date range ('7d', 'month'…), or fixed from / to
  params: ReportParams & { preset?: string };
  shared: boolean;
  mine: boolean;
  ownerName: string | null;
}

// Saves a downloaded Blob under the server's file name
function saveBlob(data: Blob, disposition: unknown, fallback: string) {
  const filename = /filename="([^"]+)"/.exec(String(disposition ?? ''))?.[1] ?? fallback;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const reportsApi = {
  catalog: async (): Promise<ReportInfo[]> => {
    const { data } = await apiClient.get('/reports/catalog');
    return data;
  },
  run: async (key: string, params: RangeParams): Promise<ReportResult> => {
    const { data } = await apiClient.get(`/reports/${key}`, { params });
    return data;
  },
  reconciliation: async (params: { from: string; to: string; branchId?: string }): Promise<ReconciliationResult> => {
    const { data } = await apiClient.get('/reports/reconciliation', { params });
    return data;
  },
  // Downloads the file through the authenticated client, then saves it
  export: async (key: string, format: ExportFormat, params: RangeParams): Promise<void> => {
    const response = await apiClient.get(`/reports/${key}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, response.headers['content-disposition'], `${key}.${format}`);
  },
  // Printable end-of-day summary (PDF) of the store or one branch
  dailySummaryPdf: async (params: { date: string; timezone?: string; branchId?: string }): Promise<void> => {
    const response = await apiClient.get('/reports/daily-summary.pdf', { params, responseType: 'blob' });
    saveBlob(response.data as Blob, response.headers['content-disposition'], `daily-summary-${params.date}.pdf`);
  },
  summary: async (params: { from: string; to: string; timezone?: string; branchId?: string }): Promise<ReportSummary> => {
    const { data } = await apiClient.get('/reports/summary', { params });
    return data;
  },
};

// Background exports: queued on the server, downloaded through a short-lived link
export const exportsApi = {
  create: async (input: { reportKey: string; format: ExportFormat; params: ReportParams }): Promise<ExportJob> => {
    const { data } = await apiClient.post('/exports', input);
    return data;
  },
  list: async (): Promise<ExportJob[]> => {
    const { data } = await apiClient.get('/exports');
    return data;
  },
  // Status, plus a download link (valid a few minutes) once the file is ready
  get: async (id: string): Promise<ExportJob> => {
    const { data } = await apiClient.get(`/exports/${id}`);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/exports/${id}`);
  },
};

export type SavedReportFilterInput = Pick<SavedReportFilter, 'reportKey' | 'name' | 'params' | 'shared'>;

export const savedFiltersApi = {
  list: async (reportKey?: string): Promise<SavedReportFilter[]> => {
    const { data } = await apiClient.get('/report-filters', { params: { reportKey } });
    return data;
  },
  create: async (input: SavedReportFilterInput): Promise<SavedReportFilter> => {
    const { data } = await apiClient.post('/report-filters', input);
    return data;
  },
  update: async (id: string, input: SavedReportFilterInput): Promise<SavedReportFilter> => {
    const { data } = await apiClient.put(`/report-filters/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/report-filters/${id}`);
  },
};
