'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Pencil, Printer, Send, ShoppingCart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { EstimateDocument } from '@/components/admin/estimate-document';
import { useApproval } from '@/components/approval-dialog';
import { Estimate, estimateCustomerName, estimatesApi } from '@/lib/api/estimates';
import { posApi } from '@/lib/api/sales';
import { getErrorMessage } from '@/lib/api/client';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { flushSync } from 'react-dom';
import { usePOSStore } from '@/stores/pos-store';
import { EstimateStatusBadge } from '@/components/admin/estimate-status-badge';
import { t } from '@/i18n';

/**
 * Printable estimate with its lifecycle actions: send, accept, decline, duplicate,
 * edit, delete, and load into the till to sell it at the quoted prices.
 */
export function EstimateDetailDialog({
  estimateId,
  onClose,
  onEdit,
  onOpen,
}: {
  estimateId: string | null;
  onClose: () => void;
  onEdit: (estimate: Estimate) => void;
  // Show another estimate (the copy made by Duplicate)
  onOpen: (id: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: settings } = useStoreSettings();
  // Printed as the estimate, or as a PRO FORMA invoice (recorded as a print job)
  const printer = usePrintDocument();
  const [proForma, setProForma] = useState(false);
  const { withApproval, approvalDialog } = useApproval();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: estimate, error } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: () => estimatesApi.get(estimateId!),
    enabled: !!estimateId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
    queryClient.invalidateQueries({ queryKey: ['estimates'] });
  };

  const action = useMutation({
    mutationFn: (name: 'send' | 'accept' | 'decline') => estimatesApi.action(estimateId!, name),
    onSuccess: refresh,
  });
  const duplicate = useMutation({
    mutationFn: () => withApproval((headers) => estimatesApi.duplicate(estimateId!, headers)),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onOpen(copy.id);
    },
  });
  const remove = useMutation({
    mutationFn: () => estimatesApi.remove(estimateId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onClose();
    },
  });

  // Put the quoted lines in the till cart; the sale then carries estimateId so the
  // server accepts the quoted prices and discounts without a manager approval
  const loadIntoTill = async () => {
    if (!estimate?.items) return;
    const pos = usePOSStore.getState();
    if (pos.cart.length > 0 && !window.confirm(t('The till has items in its cart. Replace them with this estimate?'))) return;
    setLoading(true);
    setLoadError(null);
    try {
      const lines = await Promise.all(
        estimate.items.map(async (item) => {
          const [catalog] = await posApi.catalog({ registerId: pos.registerId ?? undefined, barcode: item.sku, limit: 1 });
          if (!catalog) throw new Error(t('{sku} is no longer for sale', { sku: item.sku }));
          const price = Number(item.unitPrice);
          return {
            variantId: item.variantId,
            productId: catalog.productId,
            categoryId: catalog.categoryId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            unitPrice: price,
            catalogPrice: price,
            quantity: Number(item.quantity),
            discountPercent: Number(item.discountPercent),
            stock: catalog.stock,
            taxRate: item.taxRate != null ? Number(item.taxRate) : catalog.taxRate,
            // Measured items keep their decimal quantity and unit (1.250 kg)
            unit: catalog.unit ?? null,
          };
        })
      );
      pos.loadEstimate(
        { id: estimate.id, number: estimate.estimateNumber, cartDiscount: estimate.cartDiscount, notes: estimate.notes },
        lines,
        estimate.customer
          ? { id: estimate.customer.id, name: estimateCustomerName(estimate), loyaltyPoints: Number(estimate.customer.loyaltyPoints ?? 0) }
          : null
      );
      router.push('/pos');
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load the estimate into the till'));
    } finally {
      setLoading(false);
    }
  };

  const status = estimate?.status;
  const open = status === 'draft' || status === 'sent' || status === 'accepted';
  const busy = action.isPending || duplicate.isPending || remove.isPending || loading;
  const mutationError = action.error ?? duplicate.error ?? remove.error;

  return (
    <>
      <Dialog open={!!estimateId} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {estimate?.estimateNumber ?? t('Estimate')}
              {estimate && <EstimateStatusBadge estimate={estimate} />}
            </DialogTitle>
            <DialogDescription>
              {estimate?.status === 'converted'
                ? t('This estimate was sold.')
                : t('Print or send it to the customer, record their answer, then load it into the till to sell it.')}
            </DialogDescription>
          </DialogHeader>

          <ErrorMessage>
            {error
              ? getErrorMessage(error, 'Could not load the estimate')
              : mutationError
                ? getErrorMessage(mutationError, 'Action failed')
                : loadError}
          </ErrorMessage>
          <ErrorMessage>{printer.error}</ErrorMessage>
          {estimate?.expired && open && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {t('This estimate expired on its valid-until date. Edit it to extend the date before selling it.')}
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-4">
            {estimate && <EstimateDocument estimate={estimate} settings={settings} proForma={proForma} copy={printer.copy} />}
          </div>

          {estimate && (
            <DialogFooter className="flex-wrap gap-2">
              {status === 'draft' && (
                <Button variant="ghost" className="mr-auto text-red-600" disabled={busy} onClick={() => window.confirm(t('Delete {name}?', { name: estimate.estimateNumber })) && remove.mutate()}>
                  <Trash2 className="h-4 w-4" />
                  {t('Delete')}
                </Button>
              )}
              <Button variant="outline" disabled={busy} onClick={() => duplicate.mutate()}>
                <Copy className="h-4 w-4" />
                {t('Duplicate')}
              </Button>
              {open && (
                <Button variant="outline" disabled={busy} onClick={() => onEdit(estimate)}>
                  <Pencil className="h-4 w-4" />
                  {t('Edit')}
                </Button>
              )}
              {status === 'draft' && (
                <Button variant="outline" disabled={busy} onClick={() => action.mutate('send')}>
                  <Send className="h-4 w-4" />
                  {t('Mark as sent')}
                </Button>
              )}
              {(status === 'draft' || status === 'sent') && (
                <>
                  <Button variant="outline" disabled={busy} onClick={() => action.mutate('decline')}>
                    <X className="h-4 w-4" />
                    {t('Declined')}
                  </Button>
                  <Button variant="outline" disabled={busy || estimate.expired} onClick={() => action.mutate('accept')}>
                    <Check className="h-4 w-4" />
                    {t('Accepted')}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  flushSync(() => setProForma(false));
                  printer.print('pro_forma', estimate.id, { copy: false });
                }}
              >
                <Printer className="h-4 w-4" />
                {t('Print')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  flushSync(() => setProForma(true));
                  printer.print('pro_forma', estimate.id, { copy: false });
                }}
              >
                <Printer className="h-4 w-4" />
                {t('Print pro forma')}
              </Button>
              {open && (
                <Button disabled={busy || estimate.expired} onClick={loadIntoTill}>
                  <ShoppingCart className="h-4 w-4" />
                  {loading ? t('Loading...') : t('Sell at the till')}
                </Button>
              )}
              {status === 'converted' && <Badge variant="success">{t('Sold')}</Badge>}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
