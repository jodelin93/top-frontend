'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { AdjustmentReason, inventoryApi } from '@/lib/api/inventory';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { QUANTITY_TEXT, SIGNED_QUANTITY_TEXT } from '@/lib/pos/quantity';

type Mode = 'set' | 'delta';

const reasons: { value: AdjustmentReason; label: string }[] = [
  { value: 'recount', label: 'Stock count (recount)' },
  { value: 'damage', label: 'Damaged' },
  { value: 'theft', label: 'Theft / loss' },
  { value: 'expiry', label: 'Expired' },
  { value: 'other', label: 'Other' },
];

// Check the lines and build the request items, or return an error message
function toItems(lines: InventoryLine[], mode: Mode) {
  if (lines.length === 0) return t('Add at least one product.');
  const items: { variantId: string; quantity: number }[] = [];
  for (const line of lines) {
    const value = line.quantity.trim().replace(',', '.');
    // Decimals for measured items (kg, m, l); the server checks each unit's precision
    if (mode === 'set' && !QUANTITY_TEXT.test(value)) {
      return t('Enter the counted quantity (0 or more) for {sku}.', { sku: line.sku });
    }
    if (mode === 'delta' && (!SIGNED_QUANTITY_TEXT.test(value) || Number(value) === 0)) {
      return t('Enter a quantity to add (e.g. 5 or 1.25) or remove (e.g. -2) for {sku}.', { sku: line.sku });
    }
    items.push({ variantId: line.variantId, quantity: Number(value) });
  }
  return items;
}

interface AdjustmentResponse {
  adjustmentNumber?: string;
  items?: { variantId: string; before: number; after: number }[];
}

/**
 * Stock count or manual correction at one location.
 * Mount it only while open so each adjustment starts from a blank form.
 */
export function InventoryAdjustDialog({
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
  const [reason, setReason] = useState<AdjustmentReason>('recount');
  const [mode, setMode] = useState<Mode>('set');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const adjust = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: async (data: AdjustmentResponse, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      const byVariant = new Map(lines.map((line) => [line.variantId, line]));
      onCompleted({
        title: data.adjustmentNumber
          ? t('Adjustment {number} saved at {location}.', {
              number: data.adjustmentNumber,
              location: labelFor(input.locationId),
            })
          : t('Adjustment saved at {location}.', { location: labelFor(input.locationId) }),
        lines: (data.items ?? []).map((item) => {
          const line = byVariant.get(item.variantId);
          return `${line ? `${line.label} (${line.sku})` : item.variantId}: ${item.before} → ${item.after}`;
        }),
      });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save adjustment')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!locationId) return setError(t('Choose a location.'));
    const items = toItems(lines, mode);
    if (typeof items === 'string') return setError(items);
    adjust.mutate({ locationId, reason, mode, items, ...(notes.trim() && { notes: notes.trim() }) });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Stock count / adjustment')}</DialogTitle>
          <DialogDescription>
            {t(
              'Correct on-hand stock at one location after a count, or write off damaged, stolen or expired items.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Location')} htmlFor="adjust-location">
              <Select id="adjust-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Reason')} htmlFor="adjust-reason">
              <Select
                id="adjust-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              >
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.label)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Mode')} className="sm:col-span-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ModeOption
                  active={mode === 'set'}
                  onClick={() => setMode('set')}
                  title={t('Set counted quantity')}
                  description={t('Enter how many you counted; the difference is recorded.')}
                />
                <ModeOption
                  active={mode === 'delta'}
                  onClick={() => setMode('delta')}
                  title={t('Add / remove quantity')}
                  description={t('Enter +5 to add or -2 to remove from current stock.')}
                />
              </div>
            </Field>
            <Field label={t('Notes')} htmlFor="adjust-notes" className="sm:col-span-2">
              <Textarea
                id="adjust-notes"
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
                  onClick={() => setLines([...lines, newInventoryLine(product, variant)])}
                >
                  <Plus className="h-4 w-4" />
                  {t('Add')}
                </Button>
              )}
            />
            <InventoryLineList
              lines={lines}
              onChange={setLines}
              quantityLabel={mode === 'set' ? t('Counted') : t('+/− Qty')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={adjust.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {adjust.isPending ? t('Saving...') : t('Save adjustment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md border p-3 text-left text-sm',
        active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'hover:bg-gray-50'
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}
