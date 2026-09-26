'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
import {
  InventoryLine,
  InventoryLineList,
  InventoryResult,
  newInventoryLine,
  useStockLocationOptions,
  VariantPicker,
} from '@/components/admin/inventory-variant-picker';
import { getErrorMessage } from '@/lib/api/client';
import { inventoryApi } from '@/lib/api/inventory';
import { plural, t } from '@/i18n';
import { addQty, QUANTITY_TEXT } from '@/lib/pos/quantity';

type ReceiveItem = { variantId: string; quantity: number; cost?: number; condition?: 'good' | 'damaged' };

// Check the lines and build the request items, or return an error message.
// A line with damaged units becomes two items: good and damaged.
export function toReceiveItems(lines: InventoryLine[]) {
  if (lines.length === 0) return t('Add at least one product.');
  const items: ReceiveItem[] = [];
  for (const line of lines) {
    const goodText = line.quantity.trim().replace(',', '.') || '0';
    const damagedText = (line.damaged ?? '').trim().replace(',', '.') || '0';
    const good = Number(goodText);
    const damaged = Number(damagedText);
    // Decimals for measured items (kg, m, l); the server checks each unit's precision
    if (!QUANTITY_TEXT.test(goodText) || !QUANTITY_TEXT.test(damagedText) || addQty(good, damaged) <= 0) {
      return t('Enter a quantity above 0 (up to 4 decimals) for {sku}.', { sku: line.sku });
    }
    const cost = line.cost.trim();
    if (cost !== '' && (isNaN(Number(cost)) || Number(cost) < 0)) {
      return t('Enter a valid unit cost for {sku}.', { sku: line.sku });
    }
    const costPart = cost !== '' ? { cost: Number(cost) } : {};
    if (good > 0) items.push({ variantId: line.variantId, quantity: good, ...costPart });
    if (damaged > 0) items.push({ variantId: line.variantId, quantity: damaged, condition: 'damaged', ...costPart });
  }
  return items;
}

/**
 * Record a supplier delivery: adds stock at one location.
 * Mount it only while open so each delivery starts from a blank form.
 */
export function InventoryReceiveDialog({
  defaultLocationId,
  onClose,
  onCompleted,
}: {
  defaultLocationId: string;
  onClose: () => void;
  onCompleted: (result: InventoryResult) => void;
}) {
  const queryClient = useQueryClient();
  const { options: locations, labelFor } = useStockLocationOptions();
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const receive = useMutation({
    mutationFn: inventoryApi.receive,
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      const units = input.items.reduce((sum, item) => addQty(sum, item.quantity), 0);
      onCompleted({
        title: input.reference
          ? plural(units, 'Received {count} unit at {location} (ref. {reference}).', 'Received {count} units at {location} (ref. {reference}).', {
              location: labelFor(input.locationId),
              reference: input.reference,
            })
          : plural(units, 'Received {count} unit at {location}.', 'Received {count} units at {location}.', {
              location: labelFor(input.locationId),
            }),
        lines: lines.map((line) => {
          const damaged = Number((line.damaged ?? '').trim() || 0);
          const good = Number(line.quantity.trim() || 0);
          return damaged > 0
            ? `${line.label} (${line.sku}): +${good} · ${t('{count} damaged', { count: damaged })}`
            : `${line.label} (${line.sku}): +${good}`;
        }),
      });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not receive stock')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!locationId) return setError(t('Choose a location.'));
    const items = toReceiveItems(lines);
    if (typeof items === 'string') return setError(items);
    receive.mutate({
      locationId,
      items,
      ...(reference.trim() && { reference: reference.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Receive stock')}</DialogTitle>
          <DialogDescription>
            {t(
              "Record a delivery without a purchase order. Quantities are added to the chosen location; a unit cost updates the product's cost (moving average or FIFO, per the store's costing method). To receive against a purchase order, use Purchasing."
            )}{' '}
            {t(
              "Damaged units go to the warehouse's quarantine or damaged location when there is one, so they are not sold."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Location')} htmlFor="receive-location">
              <Select id="receive-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('Supplier reference')}
              htmlFor="receive-reference"
              hint={t('Invoice or delivery note number')}
            >
              <Input
                id="receive-reference"
                maxLength={100}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            <Field label={t('Notes')} htmlFor="receive-notes" className="sm:col-span-2">
              <Textarea
                id="receive-notes"
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t('Products')}</h3>
            <VariantPicker
              excludeIds={new Set(lines.map((l) => l.variantId))}
              renderAction={(product, variant) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLines([...lines, newInventoryLine(product, variant, '1')])}
                >
                  <Plus className="h-4 w-4" />
                  {t('Add')}
                </Button>
              )}
            />
            <InventoryLineList lines={lines} onChange={setLines} quantityLabel={t('Good')} showCost showDamaged />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={receive.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {receive.isPending ? t('Saving...') : t('Receive stock')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
