import apiClient from '@/lib/api/client';

/** Print history and receipt deliveries (top-backend/src/documents) */

export type DocumentType = 'receipt' | 'invoice' | 'credit_note' | 'pro_forma' | 'z_report' | 'label';
export type PrintJobStatus = 'queued' | 'sent' | 'printed' | 'failed' | 'unknown';
export type PrintChannel = 'bridge' | 'browser';

export interface PrintJob {
  id: string;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string | null;
  // false: the original. true: COPY #copyNumber
  copy: boolean;
  copyNumber: number | null;
  deviceId: string | null;
  printerId: string | null;
  channel: PrintChannel;
  status: PrintJobStatus;
  error: string | null;
  retryOfId: string | null;
  userId: string | null;
  userName?: string | null;
  createdAt: string;
}

export interface DocumentDelivery {
  id: string;
  documentType: DocumentType;
  documentId: string;
  channel: 'email' | 'sms_link';
  // Masked by the server (jo***@example.com)
  recipient: string | null;
  status: 'queued' | 'sent' | 'failed' | 'revoked';
  error: string | null;
  consentBasis: 'customer_consent' | 'cashier_confirmed' | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ShareLink {
  delivery: DocumentDelivery;
  token: string;
  path: string;
  expiresAt: string;
}

export const documentsApi = {
  // The server decides: the original, or COPY #n when the original is already out
  createPrintJob: async (input: {
    documentType: DocumentType;
    documentId: string;
    copy?: boolean;
    channel?: PrintChannel;
    printerId?: string | null;
  }): Promise<PrintJob> => {
    const { data } = await apiClient.post('/print-jobs', { ...input, printerId: input.printerId ?? undefined });
    return data;
  },
  updatePrintJob: async (id: string, status: PrintJobStatus, error?: string | null): Promise<PrintJob> => {
    const { data } = await apiClient.patch(`/print-jobs/${id}`, { status, error: error ?? undefined });
    return data;
  },
  // Failed: printed as asked again; uncertain: printed as a COPY
  retryPrintJob: async (id: string): Promise<PrintJob> => {
    const { data } = await apiClient.post(`/print-jobs/${id}/retry`);
    return data;
  },
  printJobs: async (documentType: DocumentType, documentId: string): Promise<PrintJob[]> => {
    const { data } = await apiClient.get('/print-jobs', { params: { documentType, documentId } });
    return data;
  },
  emailReceipt: async (
    saleId: string,
    input: { to: string; consentConfirmed?: boolean; documentType?: 'receipt' | 'invoice' }
  ): Promise<DocumentDelivery> => {
    const { data } = await apiClient.post(`/documents/receipts/${saleId}/email`, input);
    return data;
  },
  shareLink: async (saleId: string, input: { expiresInDays?: number; recipient?: string } = {}): Promise<ShareLink> => {
    const { data } = await apiClient.post(`/documents/receipts/${saleId}/share-link`, input);
    return data;
  },
  deliveries: async (documentId: string): Promise<DocumentDelivery[]> => {
    const { data } = await apiClient.get('/documents/deliveries', { params: { documentId } });
    return data;
  },
  revokeLink: async (id: string) => {
    const { data } = await apiClient.post(`/documents/deliveries/${id}/revoke`);
    return data as { id: string; status: 'revoked' };
  },
};

/** Full URL of a shared receipt (the API serves the page) */
export function publicReceiptUrl(path: string): string {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/+$/, '');
  const absolute = /^https?:\/\//.test(base) ? base : `${window.location.origin}${base}`;
  return `${absolute}${path}`;
}

export interface HardwareCapability {
  key: string;
  supported: boolean;
  via: string;
}

export interface DeviceHardwareStatus {
  deviceId: string;
  deviceName: string;
  bridgePaired: boolean;
  bridgeReachable: boolean;
  bridgeVersion: string | null;
  printers: { id: string; name: string; online: boolean; paper: 'ok' | 'low' | 'out' | null }[];
  customerDisplay: boolean;
  reportedAt: string;
}

export const hardwareApi = {
  capabilities: async (): Promise<HardwareCapability[]> => (await apiClient.get('/hardware/capabilities')).data,
  statuses: async (): Promise<DeviceHardwareStatus[]> => (await apiClient.get('/hardware/status')).data,
  report: async (input: {
    bridgePaired: boolean;
    bridgeReachable: boolean;
    bridgeVersion?: string;
    printers: { id: string; name: string; connection: string; online: boolean; paper: 'ok' | 'low' | 'out' | null; coverOpen: boolean | null; widthMm: 58 | 80 }[];
    customerDisplay?: boolean;
  }) => (await apiClient.put('/hardware/status', input)).data,
};
