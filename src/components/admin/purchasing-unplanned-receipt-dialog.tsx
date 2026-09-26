'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, useLocationOptions } from '@/components/admin/settings-shared';
import { variantLabel, VariantPicker } from '@/components/admin/inventory-variant-picker';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { goodsReceiptsApi, supplierProductsApi, UnplannedReceiptInput } from '@/lib/api/purchasing';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';
import { QUANTITY_TEXT } from '@/lib/pos/quantity';

interface Line {
  variantId: string;
  label: string;
  sku: string;
  quantity: string;
  damaged: string;
  accepted: boolean;
  unitCost: string;
}

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Receive goods from a supplier without a purchase order (needs "Receive goods
 * from a supplier without a purchase order"). The receipt can later be invoiced
 * or returned like any other.
 */
export function UnplannedReceiptDialog({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const { options: locations } = useLocationOptions();
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState(locations.find((l) => !l.isSellable)?.id ?? locations[0]?.id ?? '');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(newKey);

  const { data: supplierProducts = [] } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => supplierProductsApi.list(supplierId),
    enabled: !!supplierId,
  });

  const update = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));

  const receive = useMutation({
    mutationFn: (input: UnplannedReceiptInput) => goodsReceiptsApi.unplanned(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      onDone(
        result.duplicate
          ? t('This delivery was already recorded as {number}; nothing was added twice.', {
              number: result.receipt.receiptNumber,
            })
          : t('Received as {number}.', { number: result.receipt.receiptNumber })
      );
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not receive the goods')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError(t('Choose a supplier.'));
    if (!locationId) return setError(t('Choose where the goods will be received.'));
    const items: UnplannedReceiptInput['items'] = [];
    for (const line of lines) {
      const qty = line.quantity.trim().replace(',', '.') || '0';
      const bad = line.damaged.trim().replace(',', '.') || '0';
      // Decimals for measured items (kg, m, l); the server checks each unit's precision
      if (!QUANTITY_TEXT.test(qty) || !QUANTITY_TEXT.test(bad)) {
        return setError(t('Enter a quantity of 0 or more (up to 4 decimals) for {sku}.', { sku: line.sku }));
      }
      if (Number(qty) === 0 && Number(bad) === 0) continue;
      const cost = Number(line.unitCost);
      if (line.unitCost.trim() === '' || isNaN(cost) || cost < 0) {
        return setError(t('Enter a unit cost for {sku}.', { sku: line.sku }));
      }
      items.push({
        variantId: line.variantId,
        quantity: Number(qty),
        ...(bad !== '0' && { damagedQuantity: Number(bad), damagedAccepted: line.accepted }),
        unitCost: cost,
      });
    }
    if (items.length === 0) return setError(t('Enter at least one received quantity.'));
    receive.mutate({
      supplierId,
      locationId,
      idempotencyKey,
      items,
      ...(reference.trim() && { reference: reference.trim() }),
    });
  };

  const total = lines.reduce(
    (sum, l) => sum + ((Number(l.quantity) || 0) + (l.accepted ? Number(l.damaged) || 0 : 0)) * (Number(l.unitCost) || 0),
    0
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !receive.isPending && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Unplanned receipt')}</DialogTitle>
          <DialogDescription>
            {t('Goods delivered by a supplier without a purchase order. They are added to stock at the chosen location.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Supplier')} htmlFor="unplanned-supplier">
              <Select id="unplanned-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('Choose a supplier...')}</option>
                {suppliers
                  .filter((s) => s.status !== 'blocked')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t('Receive at')} htmlFor="unplanned-location">
              <Select id="unplanned-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Delivery note / invoice number')} htmlFor="unplanned-reference">
              <Input id="unplanned-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>

          <VariantPicker
            excludeIds={new Set(lines.map((l) => l.variantId))}
            renderAction={(product, variant) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const cost = supplierProducts.find((p) => p.variantId === variant.id)?.lastCost ?? variant.cost;
                  setLines((prev) => [
                    ...prev,
                    {
                      variantId: variant.id,
                      label: variantLabel(product, variant),
                      sku: variant.sku,
                      quantity: '1',
                      damaged: '',
                      accepted: false,
                      unitCost: cost != null ? String(cost) : '',
                    },
                  ]);
                }}
              >
                <Plus className="h-3 w-3" />
                {t('Add')}
              </Button>
            )}
          />

          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Product')}</th>
                    <th className="w-24 px-2 py-2 font-medium">{t('Good')}</th>
                    <th className="w-32 px-2 py-2 font-medium">{t('Damaged')}</th>
                    <th className="w-28 px-2 py-2 font-medium">{t('Unit cost')}</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <tr key={line.variantId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{line.label}</div>
                        <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) => update(line.variantId, { quantity: e.target.value })}
                          aria-label={t('Received quantity for {sku}', { sku: line.sku })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          inputMode="numeric"
                          placeholder="0"
                          value={line.damaged}
                          onChange={(e) => update(line.variantId, { damaged: e.target.value })}
                          aria-label={t('Damaged quantity for {sku}', { sku: line.sku })}
                        />
                        {Number(line.damaged) > 0 && (
                          <CheckboxField
                            label={t('Accept into stock')}
                            checked={line.accepted}
                            onChange={(e) => update(line.variantId, { accepted: e.target.checked })}
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          inputMode="decimal"
                          value={line.unitCost}
                          onChange={(e) => update(line.variantId, { unitCost: e.target.value })}
                          aria-label={t('Unit cost for {sku}', { sku: line.sku })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          aria-label={t('Remove {sku}', { sku: line.sku })}
                          onClick={() => setLines((prev) => prev.filter((l) => l.variantId !== line.variantId))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500">
            {t('Total of this delivery:')} {formatMoney(Math.round(total * 100) / 100, currency)}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={receive.isPending}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={receive.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {receive.isPending ? t('Receiving...') : t('Receive')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
