'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Ban, Printer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { Receipt } from '@/components/pos/receipt';
import { useReceiptPrinter } from '@/components/pos/receipt-dialog';
import { ReceiptShare } from '@/components/pos/receipt-share';
import { PrintHistory } from '@/components/pos/receipt-history';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { salesApi } from '@/lib/api/sales';
import { t, plural } from '@/i18n';

interface SaleDetailDialogProps {
  // Sale to show; null closes the dialog
  saleId: string | null;
  onClose: () => void;
}

export function SaleDetailDialog({ saleId, onClose }: SaleDetailDialogProps) {
  return (
    <Dialog open={!!saleId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {/* Keyed so the void confirmation resets for each sale */}
        {saleId && <SaleDetail key={saleId} saleId={saleId} />}
      </DialogContent>
    </Dialog>
  );
}

function SaleDetail({ saleId }: { saleId: string }) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const { data: settings } = useStoreSettings();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  // Prints from the sales history are reprints: counted on the server and marked COPY
  const printer = useReceiptPrinter();
  const { user } = useAuthStore();
  const canReprint = hasPermission(user, 'sales.reprint');
  const finished = (status: string) => !['held', 'draft', 'payment_pending', 'cancelled'].includes(status);

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesApi.get(saleId),
  });

  const voidMutation = useMutation({
    // Users without the void permission can get a manager's approval
    mutationFn: (voidReason: string) =>
      withApproval((headers) => salesApi.void(saleId, voidReason, headers)),
    onSuccess: () => {
      setConfirming(false);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleVoid = () => {
    if (!reason.trim()) {
      setReasonError(t('A reason is required'));
      return;
    }
    setReasonError(null);
    voidMutation.mutate(reason.trim());
  };

  const cancelVoid = () => {
    setConfirming(false);
    setReason('');
    setReasonError(null);
    voidMutation.reset();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {sale?.saleNumber ?? t('Sale')}
          {sale && <Badge variant={statusVariant(sale.status)}>{t(sale.status.replace('_', ' '))}</Badge>}
        </DialogTitle>
        <DialogDescription>{t('Receipt and actions for this sale.')}</DialogDescription>
      </DialogHeader>

      {error && <ErrorMessage>{getErrorMessage(error, 'Could not load sale')}</ErrorMessage>}
      {isLoading && <p className="py-10 text-center text-sm text-gray-400">{t('Loading sale...')}</p>}

      {sale && (
        <>
          <ErrorMessage>{printer.error}</ErrorMessage>
          {!!sale.receiptPrintCount && (
            <p className="text-xs text-gray-500">
              {plural(sale.receiptPrintCount, 'Receipt reprinted {count} time.', 'Receipt reprinted {count} times.')}
            </p>
          )}
          <div className="rounded-md border bg-white p-4">
            <Receipt sale={sale} settings={settings} copy={printer.copy} />
          </div>
          {printer.canRetry && (
            <Button type="button" variant="outline" size="sm" onClick={() => printer.retry()} disabled={printer.busy}>
              <RotateCcw className="h-4 w-4" />
              {printer.outcome?.status === 'unknown' ? t('Print again as a copy') : t('Try printing again')}
            </Button>
          )}
          {canReprint && finished(sale.status) && <ReceiptShare sale={sale} />}
          <PrintHistory saleId={sale.id} refreshKey={printer.outcome?.job?.id ?? null} />

          {confirming ? (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50/50 p-3">
              <p className="text-sm">
                {t(
                  'Voiding cancels this sale: stock is put back into inventory and any loyalty points earned are reversed. This cannot be undone.'
                )}
              </p>
              <Field label={t('Reason')} htmlFor="void-reason" error={reasonError ?? undefined}>
                <Textarea
                  id="void-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('e.g. Rung up by mistake')}
                  className="bg-white"
                  autoFocus
                />
              </Field>
              {voidMutation.error && (
                <ErrorMessage>{getErrorMessage(voidMutation.error, 'Could not void sale')}</ErrorMessage>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelVoid} disabled={voidMutation.isPending}>
                  {t('Keep sale')}
                </Button>
                <Button
                  type="button"
                  onClick={handleVoid}
                  disabled={voidMutation.isPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {voidMutation.isPending ? t('Voiding...') : t('Void sale')}
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter>
              {['completed', 'partially_refunded'].includes(sale.status) && (
                <Button type="button" variant="outline" asChild>
                  <Link href={`/admin/returns?sale=${encodeURIComponent(sale.saleNumber)}`}>
                    <RotateCcw className="h-4 w-4" />
                    {t('Return items')}
                  </Link>
                </Button>
              )}
              {sale.status === 'completed' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Ban className="h-4 w-4" />
                  {t('Void sale')}
                </Button>
              )}
              <Button
                type="button"
                onClick={async () => {
                  await printer.print(sale, { original: false, settings });
                  queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
                  queryClient.invalidateQueries({ queryKey: ['print-history', saleId] });
                }}
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={!canReprint || printer.busy || !finished(sale.status)}
              >
                <Printer className="h-4 w-4" />
                {t('Reprint (copy)')}
              </Button>
            </DialogFooter>
          )}
        </>
      )}
      {approvalDialog}
    </>
  );
}
