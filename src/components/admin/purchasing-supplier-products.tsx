'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { variantLabel, VariantPicker } from '@/components/admin/inventory-variant-picker';
import { useSmallScreen } from '@/components/ui/data-cards';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { Supplier, SupplierProduct, SupplierProductInput, supplierProductsApi } from '@/lib/api/purchasing';
import { t } from '@/i18n';

interface Row {
  variantId: string;
  label: string;
  sku: string;
  supplierSku: string;
  lastCost: string;
  minOrderQty: string;
  isPreferred: boolean;
}

const toRow = (p: SupplierProduct): Row => ({
  variantId: p.variantId,
  label: p.productName,
  sku: p.sku,
  supplierSku: p.supplierSku ?? '',
  lastCost: p.lastCost != null ? String(p.lastCost) : '',
  minOrderQty: p.minOrderQty != null ? String(p.minOrderQty) : '',
  isPreferred: p.isPreferred,
});

/**
 * What a supplier sells: their product codes, the last cost paid and the minimum
 * order quantity. Used to prefill purchase order lines and to group reorder
 * suggestions by preferred supplier.
 */
export function SupplierProductsDialog({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const queryClient = useQueryClient();
  const canManage = hasPermission(
    useAuthStore((s) => s.user),
    'purchasing.manage'
  );
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const smallScreen = useSmallScreen();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['supplier-products', supplier.id],
    queryFn: () => supplierProductsApi.list(supplier.id),
  });
  // Editable copy, created once the list has loaded
  const list = rows ?? (data ?? []).map(toRow);
  const edit = (next: Row[]) => setRows(next);
  const update = (variantId: string, patch: Partial<Row>) =>
    edit(list.map((r) => (r.variantId === variantId ? { ...r, ...patch } : r)));

  // Line inputs, shared by the table (desktop) and the cards (phones)
  const supplierSkuInput = (row: Row, className?: string) => (
    <Input
      value={row.supplierSku}
      disabled={!canManage}
      maxLength={100}
      onChange={(e) => update(row.variantId, { supplierSku: e.target.value })}
      className={className}
      aria-label={t('Supplier code for {sku}', { sku: row.sku })}
    />
  );
  const lastCostInput = (row: Row, className?: string) => (
    <Input
      inputMode="decimal"
      value={row.lastCost}
      disabled={!canManage}
      onChange={(e) => update(row.variantId, { lastCost: e.target.value })}
      className={className}
      aria-label={t('Last cost for {sku}', { sku: row.sku })}
    />
  );
  const minOrderInput = (row: Row, className?: string) => (
    <Input
      inputMode="numeric"
      value={row.minOrderQty}
      disabled={!canManage}
      onChange={(e) => update(row.variantId, { minOrderQty: e.target.value })}
      className={className}
      aria-label={t('Minimum order quantity for {sku}', { sku: row.sku })}
    />
  );
  const preferredCheckbox = (row: Row) => (
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={row.isPreferred}
      disabled={!canManage}
      onChange={(e) => update(row.variantId, { isPreferred: e.target.checked })}
      aria-label={t('Preferred supplier for {sku}', { sku: row.sku })}
    />
  );
  const removeButton = (row: Row) =>
    canManage && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600"
        aria-label={t('Remove {sku}', { sku: row.sku })}
        onClick={() => edit(list.filter((r) => r.variantId !== row.variantId))}
      >
        <X className="h-4 w-4" />
      </Button>
    );

  const save = useMutation({
    mutationFn: (items: SupplierProductInput[]) => supplierProductsApi.save(supplier.id, items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the supplier products')),
  });

  const handleSave = () => {
    setError(null);
    const items: SupplierProductInput[] = [];
    for (const row of list) {
      const cost = row.lastCost.trim();
      if (cost && (isNaN(Number(cost)) || Number(cost) < 0)) {
        return setError(t('Enter a valid unit cost for {sku}.', { sku: row.sku }));
      }
      const min = row.minOrderQty.trim();
      if (min && (!/^\d+$/.test(min) || Number(min) < 1)) {
        return setError(t('The minimum order quantity of {sku} must be a whole number of at least 1.', { sku: row.sku }));
      }
      items.push({
        variantId: row.variantId,
        supplierSku: row.supplierSku.trim() || null,
        lastCost: cost ? Number(cost) : null,
        minOrderQty: min ? Number(min) : null,
        isPreferred: row.isPreferred,
      });
    }
    save.mutate(items);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Products from {name}', { name: supplier.name })}</DialogTitle>
          <DialogDescription>
            {t(
              'Supplier codes, last cost and minimum order quantity prefill purchase order lines. The preferred supplier of a product is used for reorder suggestions.'
            )}
          </DialogDescription>
        </DialogHeader>
        <ErrorMessage>
          {error ?? (loadError ? getErrorMessage(loadError, 'Could not load the supplier products') : null)}
        </ErrorMessage>

        {canManage && adding && (
          <VariantPicker
            autoFocus
            excludeIds={new Set(list.map((r) => r.variantId))}
            renderAction={(product, variant) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  edit([
                    ...list,
                    {
                      variantId: variant.id,
                      label: variantLabel(product, variant),
                      sku: variant.sku,
                      supplierSku: '',
                      lastCost: variant.cost != null ? String(variant.cost) : '',
                      minOrderQty: '',
                      isPreferred: false,
                    },
                  ])
                }
              >
                <Plus className="h-3 w-3" />
                {t('Add')}
              </Button>
            )}
          />
        )}

        {smallScreen ? (
          // Phones: one card per product, every box in view (the table scrolls sideways)
          <div className="space-y-2">
            {isLoading ? (
              <p className="rounded-md border p-3 text-center text-sm text-gray-400">{t('Loading...')}</p>
            ) : list.length === 0 ? (
              <p className="rounded-md border p-3 text-center text-sm text-gray-400">
                {t('No products yet. Receiving goods from this supplier adds them automatically.')}
              </p>
            ) : (
              list.map((row) => (
                <div key={row.variantId} className="space-y-2 rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-medium">{row.label}</div>
                      <div className="font-mono text-xs text-gray-500">{row.sku}</div>
                    </div>
                    {removeButton(row)}
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs text-gray-500">{t('Supplier code')}</span>
                    {supplierSkuInput(row, 'h-10 w-full')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Last cost')}</span>
                      {lastCostInput(row, 'h-10 w-full')}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Min. order')}</span>
                      {minOrderInput(row, 'h-10 w-full')}
                    </label>
                  </div>
                  <label className="flex items-center gap-2">
                    {preferredCheckbox(row)}
                    <span>{t('Preferred')}</span>
                  </label>
                </div>
              ))
            )}
          </div>
        ) : (
        <div className="max-h-96 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t('Product')}</th>
                <th className="w-36 px-2 py-2 font-medium">{t('Supplier code')}</th>
                <th className="w-28 px-2 py-2 font-medium">{t('Last cost')}</th>
                <th className="w-24 px-2 py-2 font-medium">{t('Min. order')}</th>
                <th className="w-20 px-2 py-2 font-medium">{t('Preferred')}</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    {t('No products yet. Receiving goods from this supplier adds them automatically.')}
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.variantId}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.label}</div>
                      <div className="font-mono text-xs text-gray-500">{row.sku}</div>
                    </td>
                    <td className="px-2 py-2">
                      {supplierSkuInput(row)}
                    </td>
                    <td className="px-2 py-2">
                      {lastCostInput(row)}
                    </td>
                    <td className="px-2 py-2">
                      {minOrderInput(row)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {preferredCheckbox(row)}
                    </td>
                    <td className="px-2 py-2">
                      {removeButton(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        <DialogFooter className="sm:justify-between">
          <div>
            {canManage && !adding && (
              <Button type="button" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" />
                {t('Add products')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {canManage ? t('Cancel') : t('Close')}
            </Button>
            {canManage && (
              <Button type="button" disabled={save.isPending || isLoading} onClick={handleSave}>
                {save.isPending ? t('Saving...') : t('Save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
