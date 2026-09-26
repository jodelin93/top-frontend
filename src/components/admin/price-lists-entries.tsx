'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { VariantPicker } from '@/components/admin/inventory-variant-picker';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { PriceEntry, PriceEntryInput, PriceList, priceListsApi } from '@/lib/api/price-lists';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

// Editable values of one row (kept as input strings)
interface RowValues {
  price: string;
  minQuantity: string;
}

// A variant added in this session but not saved yet
interface NewRow extends RowValues {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  basePrice: number | null;
}

const entryValues = (entry: PriceEntry): RowValues => ({
  price: String(entry.price),
  minQuantity: entry.minQuantity?.toString() ?? '',
});

// Returns an error message for invalid values
function validate(values: RowValues, sku: string) {
  const price = values.price.trim();
  if (price === '' || isNaN(Number(price)) || Number(price) < 0) return t('Enter a valid price for {sku}.', { sku });
  const min = values.minQuantity.trim();
  if (min !== '' && (!/^\d+$/.test(min) || Number(min) < 1)) {
    return t('Minimum quantity for {sku} must be a whole number of at least 1.', { sku });
  }
  return null;
}

/**
 * Prices of one price list: edit inline, remove, and add variants.
 * Only changed and added rows are sent (the API upserts by variant).
 */
export function PriceListEntries({ priceList, onClose }: { priceList: PriceList; onClose: () => void }) {
  const queryClient = useQueryClient();
  const currency = priceList.currencyCode;
  const queryKey = ['price-lists', priceList.id, 'entries'];
  const [edits, setEdits] = useState<Record<string, RowValues>>({});
  const [added, setAdded] = useState<NewRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: entries = [], isLoading, error: loadError } = useQuery({
    queryKey,
    queryFn: () => priceListsApi.entries(priceList.id),
  });

  const changedEntries = entries.filter((entry) => {
    const edit = edits[entry.variantId];
    if (!edit) return false;
    const original = entryValues(entry);
    return (
      Number(edit.price) !== Number(original.price) || edit.minQuantity.trim() !== original.minQuantity
    );
  });
  const hasChanges = changedEntries.length > 0 || added.length > 0;

  const save = useMutation({
    mutationFn: (input: PriceEntryInput[]) => priceListsApi.setEntries(priceList.id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setEdits({});
      setAdded([]);
      setSaved(true);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save prices')),
  });

  const removeEntry = useMutation({
    mutationFn: (entry: PriceEntry) => priceListsApi.removeEntry(priceList.id, entry.id),
    onSuccess: (_data, entry) => {
      setEdits((current) => {
        const next = { ...current };
        delete next[entry.variantId];
        return next;
      });
      return queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not remove price')),
  });

  const handleSave = () => {
    setError(null);
    setSaved(false);
    const input: PriceEntryInput[] = [];
    for (const entry of changedEntries) {
      const values = edits[entry.variantId];
      const invalid = validate(values, entry.variant?.sku ?? t('a product'));
      if (invalid) return setError(invalid);
      input.push({
        variantId: entry.variantId,
        price: Number(values.price),
        // Sent back unchanged: the upsert would otherwise clear it
        compareAtPrice: entry.compareAtPrice,
        minQuantity: values.minQuantity.trim() ? Number(values.minQuantity) : null,
      });
    }
    for (const row of added) {
      const invalid = validate(row, row.sku);
      if (invalid) return setError(invalid);
      input.push({
        variantId: row.variantId,
        price: Number(row.price),
        ...(row.minQuantity.trim() && { minQuantity: Number(row.minQuantity) }),
      });
    }
    save.mutate(input);
  };

  const handleRemove = (entry: PriceEntry) => {
    const name = text(entry.variant?.product?.name, entry.variant?.sku ?? t('this product'));
    if (!window.confirm(t('Remove {name} from this price list?', { name }))) return;
    setError(null);
    removeEntry.mutate(entry);
  };

  const discard = () => {
    setEdits({});
    setAdded([]);
    setError(null);
  };

  const existingIds = new Set([...entries.map((e) => e.variantId), ...added.map((r) => r.variantId)]);

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{t('Prices in {name}', { name: text(priceList.name, priceList.code) })}</h2>
          <p className="text-sm text-gray-500">
            {t(
              'Products not listed here keep their base price. A minimum quantity makes the price apply only from that many units.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('Add products')}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('Close price editor')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load prices'))}</ErrorMessage>
        {saved && !hasChanges && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{t('Prices saved.')}</div>
        )}
      </div>

      <Table>
        <THead>
          <tr>
            <Th>{t('Product')}</Th>
            <Th>{t('SKU')}</Th>
            <Th className="text-right">{t('Base price')}</Th>
            <Th className="w-36">{t('List price')}</Th>
            <Th className="w-28">{t('Min qty')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading prices...')}</EmptyRow>
          ) : entries.length === 0 && added.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No prices yet. Click "Add products" to start.')}</EmptyRow>
          ) : (
            <>
              {entries.map((entry) => {
                const values = edits[entry.variantId] ?? entryValues(entry);
                const changed = changedEntries.includes(entry);
                return (
                  <PriceRow
                    key={entry.id}
                    productName={text(entry.variant?.product?.name, '—')}
                    variantName={text(entry.variant?.name)}
                    sku={entry.variant?.sku ?? '—'}
                    basePrice={entry.variant?.price ?? null}
                    currency={currency}
                    values={values}
                    highlight={changed ? 'changed' : undefined}
                    onChange={(next) => setEdits({ ...edits, [entry.variantId]: next })}
                    onRemove={() => handleRemove(entry)}
                  />
                );
              })}
              {added.map((row) => (
                <PriceRow
                  key={row.variantId}
                  productName={row.productName}
                  variantName={row.variantName}
                  sku={row.sku}
                  basePrice={row.basePrice}
                  currency={currency}
                  values={row}
                  highlight="new"
                  onChange={(next) =>
                    setAdded(added.map((r) => (r.variantId === row.variantId ? { ...r, ...next } : r)))
                  }
                  onRemove={() => setAdded(added.filter((r) => r.variantId !== row.variantId))}
                />
              ))}
            </>
          )}
        </TBody>
      </Table>

      <div className="flex items-center justify-end gap-2 border-t p-4">
        {hasChanges && (
          <span className="mr-auto text-sm text-gray-500">
            {plural(changedEntries.length + added.length, '{count} unsaved change', '{count} unsaved changes')}
          </span>
        )}
        <Button variant="outline" onClick={discard} disabled={!hasChanges || save.isPending}>
          {t('Discard')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || save.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {save.isPending ? t('Saving...') : t('Save prices')}
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Add products')}</DialogTitle>
            <DialogDescription>
              {t('Set a price for each variant to add. Added rows are saved when you click "Save prices".')}
            </DialogDescription>
          </DialogHeader>
          <VariantPicker
            autoFocus
            excludeIds={existingIds}
            renderAction={(product, variant) => (
              <AddWithPrice
                defaultPrice={variant.price}
                onAdd={(price) => {
                  setSaved(false);
                  setAdded((rows) => [
                    ...rows,
                    {
                      variantId: variant.id,
                      productName: text(product.name),
                      variantName: text(variant.name),
                      sku: variant.sku,
                      basePrice: variant.price,
                      price,
                      minQuantity: '',
                    },
                  ]);
                }}
              />
            )}
          />
          <DialogFooter>
            <Button onClick={() => setPickerOpen(false)}>{t('Done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PriceRow({
  productName,
  variantName,
  sku,
  basePrice,
  currency,
  values,
  highlight,
  onChange,
  onRemove,
}: {
  productName: string;
  variantName: string;
  sku: string;
  basePrice: number | null;
  currency: string;
  values: RowValues;
  highlight?: 'changed' | 'new';
  onChange: (values: RowValues) => void;
  onRemove: () => void;
}) {
  return (
    <tr className={cn(highlight ? 'bg-blue-50/60' : 'hover:bg-gray-50')}>
      <Td>
        <div className="font-medium">
          {productName}
          {highlight === 'new' && (
            <Badge variant="info" className="ml-2">
              {t('New')}
            </Badge>
          )}
        </div>
        {variantName && <div className="text-xs text-gray-500">{variantName}</div>}
      </Td>
      <Td className="font-mono text-xs">{sku}</Td>
      <Td className="text-right text-gray-600">{basePrice == null ? '—' : formatMoney(basePrice, currency)}</Td>
      <Td>
        <Input
          inputMode="decimal"
          value={values.price}
          onChange={(e) => onChange({ ...values, price: e.target.value })}
          aria-label={t('List price for {sku}', { sku })}
        />
      </Td>
      <Td>
        <Input
          inputMode="numeric"
          placeholder="1"
          value={values.minQuantity}
          onChange={(e) => onChange({ ...values, minQuantity: e.target.value })}
          aria-label={t('Minimum quantity for {sku}', { sku })}
        />
      </Td>
      <Td>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={onRemove}
            aria-label={t('Remove {sku}', { sku })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}

// Price input + Add button for one variant in the picker
function AddWithPrice({
  defaultPrice,
  onAdd,
}: {
  defaultPrice: number | null;
  onAdd: (price: string) => void;
}) {
  const [price, setPrice] = useState(defaultPrice?.toString() ?? '');
  const valid = price.trim() !== '' && !isNaN(Number(price)) && Number(price) >= 0;
  return (
    <div className="flex items-center gap-2">
      <Input
        inputMode="decimal"
        placeholder={t('Price')}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="h-8 w-24"
        aria-label={t('Price')}
      />
      <Button type="button" size="sm" variant="outline" disabled={!valid} onClick={() => onAdd(price.trim())}>
        <Plus className="h-4 w-4" />
        {t('Add')}
      </Button>
    </div>
  );
}
