'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useApproval } from '@/components/approval-dialog';
import type { AcknowledgedSale, PendingSale } from '@/lib/pos/offline-db';
import { buildExport, retryPendingSale, type UnsyncedExport } from '@/lib/pos/sync';
import { syncApi } from '@/lib/api/sync';
import { getErrorMessage } from '@/lib/api/client';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

// Receipt number printed while offline (see the POS page's saveOffline)
export const offlineNumberOf = (sale: { id: string; input?: { offlineNumber?: string } }) =>
  sale.input?.offlineNumber ?? `OFFLINE-${sale.id.slice(0, 8).toUpperCase()}`;

/** Readable text for a needs_review reason (server codes, or the server's message). */
export function describeSyncReason(reason: string): string {
  if (reason === 'payload_hash_mismatch') {
    return t('The sale was damaged on this device (its fingerprint does not match).');
  }
  if (reason === 'unsupported_schema_version') {
    return t('This sale was saved by a newer version of the app than the server understands.');
  }
  if (reason === 'operation_id_reused' || reason === 'idempotency_key_mismatch') {
    return t('A different sale was already uploaded under the same id.');
  }
  if (reason === 'missing_capture_time') return t('The sale has no time of sale.');
  if (reason.startsWith('invalid_payload:')) {
    return t('The sale is incomplete: {details}', { details: reason.slice('invalid_payload:'.length).trim() });
  }
  return t(reason);
}

function download(file: UnsyncedExport) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `unsynced-sales-${(file.device?.name ?? 'till').replace(/[^\w-]+/g, '_')}-${file.exportedAt.slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sales recorded offline: those still waiting to upload (needs-review ones with the
 * server's reason), and those the server has acknowledged (provisional OFFLINE
 * number → final sale number). A manager can export the waiting ones to a file
 * (for a till that can no longer upload); an administrator imports it under
 * Admin → Devices.
 */
export function PendingSalesDialog({
  open,
  onOpenChange,
  sales,
  acknowledged = [],
  currency,
  online,
  syncing,
  onSync,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: PendingSale[];
  acknowledged?: AcknowledgedSale[];
  currency: string;
  online: boolean;
  syncing: boolean;
  onSync: () => void;
}) {
  const failed = sales.filter((s) => s.error);
  const user = useAuthStore((state) => state.user);
  const { withApproval, approvalDialog } = useApproval();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Time the list was opened (postponed uploads are shown against it)
  const [openedAt] = useState(() => Date.now());

  const exportSales = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const file = await buildExport();
      if (online) {
        // Manager approval (the file holds payments and customers); on record
        await withApproval((headers) =>
          syncApi.exportApproval({ deviceId: file.device?.id, operations: file.count }, headers)
        );
      } else if (!hasPermission(user, 'sales.review')) {
        throw new Error(t("Exporting sales needs a manager's approval, which needs a connection."));
      }
      download(file);
    } catch (error) {
      setExportError(error instanceof Error && !('response' in error) ? error.message : getErrorMessage(error, 'The sales could not be exported'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Offline sales')}</DialogTitle>
          <DialogDescription>
            {t("Sales rung up without a connection are stored on this device and uploaded automatically. Don't clear this browser's data while any are waiting.")}
          </DialogDescription>
        </DialogHeader>

        {sales.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{t('All sales are uploaded.')}</p>
        ) : (
          <div className="max-h-80 divide-y overflow-y-auto rounded-md border text-sm max-sm:max-h-none">
            {sales.map((sale) => (
              <div key={sale.id} className="px-3 py-2">
                <div className="flex justify-between gap-2 max-sm:flex-wrap">
                  <span>
                    <span className="font-mono text-xs">{offlineNumberOf(sale)}</span>
                    <span className="ml-2 text-gray-500">{formatDateTime(sale.createdAt)}</span>
                    {sale.deviceSequence !== undefined && (
                      <span className="ml-2 text-xs text-gray-400">#{sale.deviceSequence}</span>
                    )}
                  </span>
                  <span className="font-medium">{formatMoney(sale.total, currency)}</span>
                </div>
                {sale.error ? (
                  <div className="mt-1 flex items-start justify-between gap-2 text-red-600">
                    <span className="flex items-start gap-1">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-medium">{t('Needs review')}:</span> {describeSyncReason(sale.error)}
                      </span>
                    </span>
                    <Button size="sm" variant="outline" disabled={!online} onClick={() => retryPendingSale(sale.id).then(onSync)}>
                      {t('Retry')}
                    </Button>
                  </div>
                ) : sale.nextAttemptAt && Date.parse(sale.nextAttemptAt) > openedAt ? (
                  <div className="flex items-center gap-1 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    {t('Upload postponed, next try at {time}', { time: formatDateTime(sale.nextAttemptAt) })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">{t('Waiting to upload')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {acknowledged.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">{t('Uploaded')}</div>
            <div className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
              {acknowledged.slice(0, 50).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                    <span className="font-mono text-xs">{offlineNumberOf(sale)}</span>
                    <span aria-hidden>→</span>
                    <span className="sr-only">{t('is now')}</span>
                    <span className="font-mono text-xs font-semibold">{sale.saleNumber}</span>
                  </span>
                  <span className="text-right">
                    <span className="font-medium">{formatMoney(sale.total, currency)}</span>
                    <span className="block text-xs text-gray-500">{formatDateTime(sale.acknowledgedAt)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {failed.length > 0 && (
          <p className="text-xs text-gray-500">
            {t('Rejected sales stay here until they upload. Fix the cause (for example a deleted register or payment method) and retry, or ask a manager to re-enter the sale.')}
          </p>
        )}

        {exportError && <p className="text-sm text-red-600">{exportError}</p>}

        <div className={cn('flex flex-wrap gap-2', dialogStickyFooter)}>
          <Button className="flex-1" onClick={onSync} disabled={!online || syncing || sales.length === 0}>
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {online ? (syncing ? t('Uploading...') : t('Upload now')) : t('Waiting for connection')}
          </Button>
          {sales.length > 0 && (
            <Button variant="outline" onClick={exportSales} disabled={exporting}>
              <Download className="h-4 w-4" />
              {t('Export unsynced sales')}
            </Button>
          )}
        </div>
        {approvalDialog}
      </DialogContent>
    </Dialog>
  );
}
