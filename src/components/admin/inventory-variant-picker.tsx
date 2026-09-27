'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSmallScreen } from '@/components/ui/data-cards';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { Product, ProductVariant, productsApi } from '@/lib/api/products';
import { LocationStockStatus, StockLocation } from '@/lib/api/inventory';
import { locationsApi } from '@/lib/api/settings';
import { useLocationOptions } from '@/components/admin/settings-shared';
import { t } from '@/i18n';

/**
 * Stock locations for inventory screens: the system transit location is left out
 * of the options (stock only gets there by dispatching a transfer), labelFor still
 * names it. Each option carries its stock status.
 */
export function useStockLocationOptions() {
  const { options, labelFor, isLoading } = useLocationOptions();
  // Same query (and cache) as useLocationOptions
  const { data: locations = [] } = useQuery<StockLocation[]>({
    queryKey: ['locations'],
    queryFn: () => locationsApi.list(),
  });
  const statuses = new Map<string, LocationStockStatus>(
    locations.map((l) => [l.id, l.stockStatus ?? (l.isSellable ? 'sellable' : 'quarantine')])
  );
  return {
    options: options
      .filter((o) => statuses.get(o.id) !== 'transit')
      .map((o) => ({ ...o, stockStatus: statuses.get(o.id) ?? (o.isSellable ? 'sellable' : 'quarantine') })),
    labelFor,
    statusFor: (id: string | null | undefined) => (id ? statuses.get(id) : undefined),
    isLoading,
  };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

// "Product — Variant" (simple products only have the default variant)
export function variantLabel(product: Pick<Product, 'name'>, variant: Pick<ProductVariant, 'name'>) {
  const variantName = text(variant.name);
  return variantName ? `${text(product.name)} — ${variantName}` : text(product.name);
}

const MAX_PRODUCTS = 25;

/**
 * Search active products and list their variants, each with a caller-supplied action
 * (e.g. an "Add" button). Variants in excludeIds are shown as already added.
 */
export function VariantPicker({
  renderAction,
  excludeIds,
  autoFocus,
}: {
  renderAction: (product: Product, variant: ProductVariant) => ReactNode;
  excludeIds?: Set<string>;
  autoFocus?: boolean;
}) {
  const currency = useCurrency();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data: products = [], isFetching, error } = useQuery({
    queryKey: ['products', 'picker', debouncedSearch],
    queryFn: () => productsApi.list({ search: debouncedSearch || undefined, status: 'active' }),
  });

  const rows = products.slice(0, MAX_PRODUCTS).flatMap((product) =>
    (product.variants ?? [])
      .filter((variant) => variant.status !== 'discontinued')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((variant) => ({ product, variant }))
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t('Search products by name, SKU or barcode...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          autoFocus={autoFocus}
        />
      </div>
      {error && <p className="text-sm text-red-600">{getErrorMessage(error, 'Could not search products')}</p>}
      <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-400">
            {isFetching ? t('Searching...') : t('No active products found.')}
          </p>
        ) : (
          rows.map(({ product, variant }) => (
            <div key={variant.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{variantLabel(product, variant)}</div>
                <div className="text-xs text-gray-500">
                  <span className="font-mono">{variant.sku}</span>
                  {variant.price != null && <> · {formatMoney(variant.price, currency)}</>}
                  {' · '}
                  {t('{count} in stock', { count: variant.stockQuantity })}
                </div>
              </div>
              {excludeIds?.has(variant.id) ? (
                <span className="text-xs text-gray-400">{t('Added')}</span>
              ) : (
                renderAction(product, variant)
              )}
            </div>
          ))
        )}
      </div>
      {products.length > MAX_PRODUCTS && (
        <p className="text-xs text-gray-500">
          {t('Showing the first {count} products. Refine your search to find others.', { count: MAX_PRODUCTS })}
        </p>
      )}
    </div>
  );
}

// ---- Line list shared by the receive and count dialogs ----

export interface InventoryLine {
  variantId: string;
  label: string;
  sku: string;
  quantity: string;
  cost: string;
  // Units that arrived damaged (receiving only)
  damaged?: string;
}

export function newInventoryLine(product: Product, variant: ProductVariant, quantity = ''): InventoryLine {
  return { variantId: variant.id, label: variantLabel(product, variant), sku: variant.sku, quantity, cost: '' };
}

// Result shown on the inventory page after a receive / adjustment
export interface InventoryResult {
  title: string;
  lines?: string[];
}

export function InventoryLineList({
  lines,
  onChange,
  quantityLabel,
  showCost,
  showDamaged,
}: {
  lines: InventoryLine[];
  onChange: (lines: InventoryLine[]) => void;
  quantityLabel: string;
  showCost?: boolean;
  // Second quantity column for units that arrived damaged
  showDamaged?: boolean;
}) {
  const smallScreen = useSmallScreen();
  const update = (variantId: string, patch: Partial<InventoryLine>) =>
    onChange(lines.map((line) => (line.variantId === variantId ? { ...line, ...patch } : line)));

  if (lines.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-gray-400">
        {t('No products added yet. Search above and click Add.')}
      </p>
    );
  }

  // The same inputs in the table and the phone cards
  const quantityInput = (line: InventoryLine, className?: string) => (
    <Input
      inputMode="numeric"
      value={line.quantity}
      onChange={(e) => update(line.variantId, { quantity: e.target.value })}
      aria-label={t('{label} for {sku}', { label: quantityLabel, sku: line.sku })}
      className={className}
    />
  );
  const damagedInput = (line: InventoryLine, className?: string) => (
    <Input
      inputMode="numeric"
      placeholder="0"
      value={line.damaged ?? ''}
      onChange={(e) => update(line.variantId, { damaged: e.target.value })}
      aria-label={t('Damaged quantity for {sku}', { sku: line.sku })}
      className={className}
    />
  );
  const costInput = (line: InventoryLine, className?: string) => (
    <Input
      inputMode="decimal"
      placeholder={t('Optional')}
      value={line.cost}
      onChange={(e) => update(line.variantId, { cost: e.target.value })}
      aria-label={t('Unit cost for {sku}', { sku: line.sku })}
      className={className}
    />
  );
  const removeButton = (line: InventoryLine) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700"
      onClick={() => onChange(lines.filter((l) => l.variantId !== line.variantId))}
      aria-label={t('Remove {sku}', { sku: line.sku })}
    >
      <X className="h-4 w-4" />
    </Button>
  );

  if (smallScreen) {
    // Phones: one card per line, every box in view (the table would scroll sideways)
    return (
      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.variantId} className="space-y-2 rounded-md border p-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="break-words font-medium">{line.label}</div>
                <div className="font-mono text-xs text-gray-500">{line.sku}</div>
              </div>
              {removeButton(line)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{quantityLabel}</span>
                {quantityInput(line, 'h-10')}
              </label>
              {showDamaged && (
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">{t('Damaged')}</span>
                  {damagedInput(line, 'h-10')}
                </label>
              )}
              {showCost && (
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">{t('Unit cost')}</span>
                  {costInput(line, 'h-10')}
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">{t('Product')}</th>
            <th className="w-28 px-3 py-2 font-medium">{quantityLabel}</th>
            {showDamaged && <th className="w-28 px-3 py-2 font-medium">{t('Damaged')}</th>}
            {showCost && <th className="w-32 px-3 py-2 font-medium">{t('Unit cost')}</th>}
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((line) => (
            <tr key={line.variantId}>
              <td className="px-3 py-2">
                <div className="font-medium">{line.label}</div>
                <div className="font-mono text-xs text-gray-500">{line.sku}</div>
              </td>
              <td className="px-3 py-2">{quantityInput(line)}</td>
              {showDamaged && <td className="px-3 py-2">{damagedInput(line)}</td>}
              {showCost && <td className="px-3 py-2">{costInput(line)}</td>}
              <td className="px-3 py-2">{removeButton(line)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
