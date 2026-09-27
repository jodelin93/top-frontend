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
import { useSmallScreen } from '@/components/ui/data-cards';
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
  const smallScreen = useSmallScreen();

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

  // Saved and added prices, as table rows or (phones) cards
  const renderRows = (card: boolean) => (
    <>
      {entries.map((entry) => {
        const values = edits[entry.variantId] ?? entryValues(entry);
        const changed = changedEntries.includes(entry);
        return (
          <PriceRow
            key={entry.id}
            card={card}
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
          card={card}
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
  );

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

      {smallScreen ? (
        // Phones: one card per price with full-width inputs instead of a table that scrolls sideways
        isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">{t('Loading prices...')}</p>
        ) : entries.length === 0 && added.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">
            {t('No prices yet. Click "Add products" to start.')}
          </p>
        ) : (
          <div className="space-y-2 p-3">{renderRows(true)}</div>
        )
      ) : (
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
            renderRows(false)
          )}
        </TBody>
      </Table>
      )}

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
  card,
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
  /** Phones: a card with full-width inputs instead of a table row */
  card?: boolean;
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
  const priceInput = (className?: string) => (
    <Input
      inputMode="decimal"
      value={values.price}
      onChange={(e) => onChange({ ...values, price: e.target.value })}
      aria-label={t('List price for {sku}', { sku })}
      className={className}
    />
  );
  const minQuantityInput = (className?: string) => (
    <Input
      inputMode="numeric"
      placeholder="1"
      value={values.minQuantity}
      onChange={(e) => onChange({ ...values, minQuantity: e.target.value })}
      aria-label={t('Minimum quantity for {sku}', { sku })}
      className={className}
    />
  );
  const removeButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-red-600 hover:text-red-700"
      onClick={onRemove}
      aria-label={t('Remove {sku}', { sku })}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
  const name = (
    <>
      <div className="font-medium">
        {productName}
        {highlight === 'new' && (
          <Badge variant="info" className="ml-2">
            {t('New')}
          </Badge>
        )}
      </div>
      {variantName && <div className="text-xs text-gray-500">{variantName}</div>}
    </>
  );

  if (card) {
    return (
      <div className={cn('space-y-2 rounded-lg border p-3 text-sm', highlight ? 'bg-blue-50/60' : 'bg-white')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 break-words">
            {name}
            <div className="font-mono text-xs text-gray-500">{sku}</div>
          </div>
          {removeButton}
        </div>
        <div className="text-xs text-gray-500">
          {t('Base price')}: {basePrice == null ? '—' : formatMoney(basePrice, currency)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-gray-500">{t('List price')}</span>
            {priceInput('h-10')}
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-500">{t('Min qty')}</span>
            {minQuantityInput('h-10')}
          </label>
        </div>
      </div>
    );
  }

  return (
    <tr className={cn(highlight ? 'bg-blue-50/60' : 'hover:bg-gray-50')}>
      <Td>{name}</Td>
      <Td className="font-mono text-xs">{sku}</Td>
      <Td className="text-right text-gray-600">{basePrice == null ? '—' : formatMoney(basePrice, currency)}</Td>
      <Td>{priceInput()}</Td>
      <Td>{minQuantityInput()}</Td>
      <Td>
        <div className="flex justify-end">{removeButton}</div>
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
