'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { variantLabel, VariantPicker } from '@/components/admin/inventory-variant-picker';
import { useCurrency, useStoreSettings } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { CostingMethodChangeResult, inventoryApi, RevaluationResult } from '@/lib/api/inventory';
import type { Product, ProductVariant } from '@/lib/api/products';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

type CostingMethod = 'average' | 'fifo';

const methodLabels: Record<CostingMethod, string> = {
  average: 'Moving average',
  fifo: 'FIFO (first in, first out)',
};

/**
 * Stock valuation: the store's costing method (switched through a controlled,
 * audited revaluation) and manual cost revaluations.
 */
export function ValuationTab() {
  const user = useAuthStore((s) => s.user);
  const canSeeCost = hasPermission(user, 'inventory.cost.view');
  const canRevalue = canSeeCost && hasPermission(user, 'inventory.adjust');
  const canChangeMethod = canSeeCost && hasPermission(user, 'settings.manage');
  const { data: settings } = useStoreSettings();
  const currency = useCurrency();
  const [dialog, setDialog] = useState<'revalue' | 'method' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const method: CostingMethod = settings?.costingMethod ?? 'average';

  return (
    <div className="space-y-4">
      {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</div>}

      <Card className="space-y-3 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">{t('Costing method')}</h2>
            <p className="text-sm text-gray-500">
              {t('How the cost of sold stock is worked out. Current method:')}{' '}
              <strong className="text-gray-800">{t(methodLabels[method])}</strong>
            </p>
          </div>
          {canChangeMethod && (
            <Button variant="outline" onClick={() => setDialog('method')}>
              <RefreshCw className="h-4 w-4" />
              {method === 'average' ? t('Switch to FIFO...') : t('Switch to moving average...')}
            </Button>
          )}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            {t(
              'To moving average: each unit cost becomes the weighted cost of its remaining FIFO layers.'
            )}
          </li>
          <li>
            {t(
              'To FIFO: the remaining layers are re-costed at the current average cost; FIFO applies to what comes in next.'
            )}
          </li>
          <li>{t('Each change is recorded as a revaluation entry in the stock movements and audited.')}</li>
        </ul>
      </Card>

      {canRevalue && (
        <Card className="flex flex-col gap-2 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">{t('Revalue a product')}</h2>
            <p className="text-sm text-gray-500">
              {t(
                'Correct the unit cost of a product (e.g. a wrong purchase price). Quantities do not change; the value difference is recorded as a revaluation entry.'
              )}
            </p>
          </div>
          <Button onClick={() => setDialog('revalue')} className="bg-blue-600 text-white hover:bg-blue-700">
            <Calculator className="h-4 w-4" />
            {t('Revalue...')}
          </Button>
        </Card>
      )}

      {dialog === 'revalue' && (
        <RevaluationDialog
          onClose={() => setDialog(null)}
          onDone={(result) => {
            setDialog(null);
            setMessage(
              t('{sku} revalued: {before} → {after} per unit ({change} on {count} units).', {
                sku: result.sku,
                before: result.beforeCost == null ? '—' : formatMoney(result.beforeCost, currency),
                after: formatMoney(result.afterCost, currency),
                change: formatMoney(result.valueChange, currency),
                count: result.quantity,
              })
            );
          }}
        />
      )}
      {dialog === 'method' && (
        <CostingMethodDialog
          current={method}
          onClose={() => setDialog(null)}
          onDone={(result) => {
            setDialog(null);
            setMessage(
              plural(
                result.revalued,
                'Costing method changed to {method}. {count} product was revalued.',
                'Costing method changed to {method}. {count} products were revalued.',
                { method: t(methodLabels[result.method]) }
              )
            );
          }}
        />
      )}
    </div>
  );
}

function RevaluationDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (result: RevaluationResult) => void;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const { withApproval, approvalDialog } = useApproval();
  const [selected, setSelected] = useState<{ product: Product; variant: ProductVariant } | null>(null);
  const [newCost, setNewCost] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const revalue = useMutation({
    mutationFn: (input: { variantId: string; newCost: number; reason: string }) =>
      withApproval((headers) => inventoryApi.revalue(input, headers)),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      onDone(result);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not revalue the product')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selected) return setError(t('Choose a product.'));
    const cost = Number(newCost.trim());
    if (newCost.trim() === '' || isNaN(cost) || cost < 0) return setError(t('Enter a new unit cost of 0 or more.'));
    if (!reason.trim()) return setError(t('Enter a reason.'));
    revalue.mutate({ variantId: selected.variant.id, newCost: cost, reason: reason.trim() });
  };

  const currentCost = selected?.variant.cost;
  const stock = selected?.variant.stockQuantity ?? 0;
  const cost = Number(newCost.trim());
  const preview =
    selected && newCost.trim() !== '' && !isNaN(cost) && cost >= 0
      ? stock * (cost - Number(currentCost ?? 0))
      : null;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !revalue.isPending && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Revalue a product')}</DialogTitle>
            <DialogDescription>
              {t('Sets a new unit cost for the stock on hand. Recorded as a revaluation entry and audited.')}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <ErrorMessage>{error}</ErrorMessage>
            {selected ? (
              <div className="flex items-start justify-between gap-2 rounded-md border bg-gray-50 p-3 text-sm">
                <div>
                  <div className="font-medium">{variantLabel(selected.product, selected.variant)}</div>
                  <div className="text-xs text-gray-500">
                    <span className="font-mono">{selected.variant.sku}</span> ·{' '}
                    {t('{count} in stock', { count: stock })} ·{' '}
                    {t('current cost {cost}', {
                      cost: currentCost == null ? '—' : formatMoney(currentCost, currency),
                    })}
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelected(null)}>
                  {t('Change')}
                </Button>
              </div>
            ) : (
              <VariantPicker
                autoFocus
                renderAction={(product, variant) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected({ product, variant });
                      setNewCost(variant.cost == null ? '' : String(variant.cost));
                    }}
                  >
                    {t('Choose')}
                  </Button>
                )}
              />
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('New unit cost')} htmlFor="revalue-cost">
                <Input
                  id="revalue-cost"
                  inputMode="decimal"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  disabled={!selected}
                />
              </Field>
              <div className="self-end pb-2 text-sm text-gray-600">
                {preview !== null && (
                  <span className={cn(preview < 0 ? 'text-red-700' : preview > 0 ? 'text-green-700' : '')}>
                    {t('Stock value change: {amount}', { amount: formatMoney(preview, currency) })}
                  </span>
                )}
              </div>
            </div>
            <Field label={t('Reason (required)')} htmlFor="revalue-reason">
              <Textarea
                id="revalue-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('e.g. Supplier invoice corrected')}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={revalue.isPending}>
                {t('Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={revalue.isPending || !selected || !reason.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {revalue.isPending ? t('Saving...') : t('Revalue')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}

function CostingMethodDialog({
  current,
  onClose,
  onDone,
}: {
  current: CostingMethod;
  onClose: () => void;
  onDone: (result: CostingMethodChangeResult) => void;
}) {
  const queryClient = useQueryClient();
  const target: CostingMethod = current === 'average' ? 'fifo' : 'average';
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: inventoryApi.changeCostingMethod,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      onDone(result);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not change the costing method')),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !change.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('Switch to {method}', { method: t(methodLabels[target]) })}
          </DialogTitle>
          <DialogDescription>
            {target === 'average'
              ? t(
                  'Each product with stock gets the weighted cost of its remaining FIFO layers as its unit cost. From then on, cost of sales uses the moving average.'
                )
              : t(
                  'The remaining stock of each product is re-costed as one layer at its current average cost (its value does not change). From then on, the oldest units are costed first.'
                )}{' '}
            {t('Every cost that changes is recorded as a revaluation entry, and the change is audited.')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!reason.trim()) return setError(t('Enter a reason.'));
            change.mutate({ method: target, reason: reason.trim() });
          }}
        >
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('Reason (required)')} htmlFor="costing-reason">
            <Textarea
              id="costing-reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('e.g. Accountant request for the new fiscal year')}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={change.isPending}>
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={change.isPending || !reason.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {change.isPending ? t('Switching...') : t('Switch costing method')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
