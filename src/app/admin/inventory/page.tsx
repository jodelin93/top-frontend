'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, DatabaseZap, PackagePlus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { useLocationOptions } from '@/components/admin/settings-shared';
import {
  InventoryResult,
  useDebouncedValue,
  useStockLocationOptions,
} from '@/components/admin/inventory-variant-picker';
import { InventoryReceiveDialog } from '@/components/admin/inventory-receive-dialog';
import { InventoryAdjustDialog } from '@/components/admin/inventory-adjust-dialog';
import { CountsTab } from '@/components/admin/inventory-counts';
import { TransfersTab } from '@/components/admin/inventory-transfers';
import { InventoryRebuildDialog } from '@/components/admin/inventory-rebuild-dialog';
import { AgingTab } from '@/components/admin/inventory-aging';
import { ValuationTab } from '@/components/admin/inventory-valuation';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { useCurrency, useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { inventoryApi, LocationStockStatus, StockMovement, stockRowUnit } from '@/lib/api/inventory';
import { formatQuantity } from '@/lib/pos/quantity';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Tab = 'stock' | 'movements' | 'counts' | 'transfers' | 'aging' | 'valuation';

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('stock');
  const user = useAuthStore((s) => s.user);
  // Valuation needs to see costs, and to adjust stock (revaluations) or manage settings (costing method)
  const canValue =
    hasPermission(user, 'inventory.cost.view') &&
    (hasPermission(user, 'inventory.adjust') || hasPermission(user, 'settings.manage'));
  const tabs: { id: Tab; label: string }[] = [
    { id: 'stock', label: 'Stock' },
    { id: 'movements', label: 'Movements' },
    { id: 'counts', label: 'Counts' },
    { id: 'transfers', label: 'Transfers' },
    { id: 'aging', label: 'Aging' },
    ...(canValue ? [{ id: 'valuation' as const, label: 'Valuation' }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title={t('Inventory')} description={t('Stock on hand per location, deliveries, counts and history.')} />

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
              tab === item.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockTab />}
      {tab === 'movements' && <MovementsTab />}
      {tab === 'counts' && <CountsTab />}
      {tab === 'transfers' && <TransfersTab />}
      {tab === 'aging' && <AgingTab />}
      {tab === 'valuation' && canValue && <ValuationTab />}
    </div>
  );
}

// ---- Stock ----

function StockTab() {
  const { data: settings } = useStoreSettings();
  const { options: locations, labelFor } = useStockLocationOptions();
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [sellableOnly, setSellableOnly] = useState(false);
  const [dialog, setDialog] = useState<'receive' | 'adjust' | null>(null);
  const [result, setResult] = useState<InventoryResult | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const threshold = settings?.lowStockThreshold ?? 5;

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'stock', debouncedSearch, locationId, lowStock, sellableOnly],
    queryFn: () =>
      inventoryApi.stock({
        search: debouncedSearch || undefined,
        locationId: locationId || undefined,
        lowStock: lowStock || undefined,
        sellableOnly: sellableOnly || undefined,
      }),
  });

  // Dialogs start at the filtered location, else the first sellable one
  const defaultLocationId =
    locationId || locations.find((l) => l.stockStatus === 'sellable')?.id || locations[0]?.id || '';

  return (
    <div className="space-y-4">
      {result && (
        <div className="flex gap-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">{result.title}</div>
            {result.lines && result.lines.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {result.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={() => setResult(null)} aria-label={t('Dismiss')} className="self-start">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Search by name, SKU or barcode...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="lg:w-56"
            aria-label={t('Filter by location')}
          >
            <option value="">{t('All locations')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={lowStock}
              onChange={(e) => setLowStock(e.target.checked)}
            />
            {t('Low stock only')}
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={sellableOnly}
              onChange={(e) => setSellableOnly(e.target.checked)}
            />
            {t('Sellable only')}
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDialog('adjust')}
              disabled={locations.length === 0}
              title={locations.length === 0 ? t('Create a stock location in Settings first') : undefined}
            >
              <ClipboardList className="h-4 w-4" />
              {t('Count / adjust')}
            </Button>
            <Button
              onClick={() => setDialog('receive')}
              disabled={locations.length === 0}
              title={locations.length === 0 ? t('Create a stock location in Settings first') : undefined}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <PackagePlus className="h-4 w-4" />
              {t('Receive stock')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load stock')}</ErrorMessage>
          </div>
        )}

        <Table>
          <THead>
            <tr>
              <Th>{t('Product')}</Th>
              <Th>{t('SKU')}</Th>
              <Th>{t('Barcode')}</Th>
              <Th>{t('Location')}</Th>
              <Th className="text-right">{t('On hand')}</Th>
              <Th className="text-right">{t('Reserved')}</Th>
              <Th className="text-right">{t('Available')}</Th>
              <Th className="text-right">{t('In transit')}</Th>
              <Th>{t('Last counted')}</Th>
              <Th>{t('Last received')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={10}>{t('Loading stock...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={10}>
                {locations.length === 0
                  ? t('No stock locations yet. Create one under Settings → Warehouses & locations.')
                  : search || locationId || lowStock || sellableOnly
                    ? t('No stock matches your filters.')
                    : t('No products yet.')}
              </EmptyRow>
            ) : (
              rows.map((row) => {
                const reorderAt = row.reorderPoint ?? threshold;
                const isLow = row.quantityOnHand <= reorderAt;
                const variantName = text(row.variantName);
                // Measured items: "12.350 kg"
                const unit = stockRowUnit(row);
                const qty = (value: number) => formatQuantity(Number(value), unit);
                return (
                  <tr
                    key={`${row.variantId}-${row.locationId}`}
                    className={cn(isLow ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50')}
                  >
                    <Td>
                      <div className="font-medium">{text(row.productName, '—')}</div>
                      {variantName && <div className="text-xs text-gray-500">{variantName}</div>}
                    </Td>
                    <Td className="font-mono text-xs">{row.sku}</Td>
                    <Td className="font-mono text-xs">{row.barcode ?? '—'}</Td>
                    <Td>
                      {labelFor(row.locationId, row.locationName || row.locationCode)}
                      {row.stockStatus && row.stockStatus !== 'sellable' && (
                        <Badge
                          variant={row.stockStatus === 'damaged' ? 'danger' : 'warning'}
                          className="ml-2"
                          title={t('Not available for sale')}
                        >
                          {t(stockStatusLabels[row.stockStatus])}
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <span className={cn('font-medium', isLow && 'text-red-700')}>{qty(row.quantityOnHand)}</span>
                      {isLow && (
                        <Badge variant="danger" className="ml-2" title={t('Reorder point: {count}', { count: reorderAt })}>
                          {t('Low')}
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-right text-gray-600">
                      {Number(row.quantityReserved) ? qty(row.quantityReserved) : '—'}
                    </Td>
                    <Td className="text-right">{qty(row.quantityAvailable)}</Td>
                    <Td className="text-right text-gray-600">
                      {Number(row.quantityInTransit) ? qty(row.quantityInTransit) : '—'}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">{formatDate(row.lastCountedAt)}</Td>
                    <Td className="whitespace-nowrap text-gray-600">{formatDate(row.lastReceivedAt)}</Td>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
        {rows.length > 0 && (
          <p className="border-t px-4 py-2 text-xs text-gray-500">
            {t(
              "Rows in red are at or below their reorder point (or the store's low-stock threshold of {threshold}).",
              { threshold }
            )}{' '}
            {t('Only stock at sellable locations can be sold; quarantine and damaged stock is kept apart.')}
          </p>
        )}
      </Card>

      {dialog === 'receive' && (
        <InventoryReceiveDialog
          defaultLocationId={defaultLocationId}
          onClose={() => setDialog(null)}
          onCompleted={setResult}
        />
      )}
      {dialog === 'adjust' && (
        <InventoryAdjustDialog
          defaultLocationId={defaultLocationId}
          onClose={() => setDialog(null)}
          onCompleted={setResult}
        />
      )}
    </div>
  );
}

const stockStatusLabels: Record<LocationStockStatus, string> = {
  sellable: 'Sellable',
  quarantine: 'Quarantine',
  damaged: 'Damaged',
  transit: 'In transit',
};

// ---- Movements ----

const movementLabels: Record<StockMovement['movementType'], string> = {
  sale: 'Sale',
  purchase: 'Received',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
  return: 'Return',
  damage: 'Damage',
  theft: 'Theft',
  recount: 'Recount',
  revaluation: 'Revaluation',
};

function MovementsTab() {
  const currency = useCurrency();
  const { options: locations, labelFor } = useLocationOptions();
  const [locationId, setLocationId] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const canAdjust = hasPermission(useAuthStore((s) => s.user), 'inventory.adjust');

  const { data: movements = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'movements', locationId],
    queryFn: () => inventoryApi.movements({ locationId: locationId || undefined, limit: 200 }),
  });

  // Stock coming into the (filtered) location is positive, stock leaving it negative
  const signedQuantity = (movement: StockMovement) => {
    if (movement.movementType === 'revaluation') return { text: '—', className: 'text-gray-400' };
    const incoming = locationId
      ? movement.toLocationId === locationId
      : !!movement.toLocationId && !movement.fromLocationId;
    const outgoing = locationId
      ? movement.fromLocationId === locationId
      : !!movement.fromLocationId && !movement.toLocationId;
    if (incoming) return { text: `+${movement.quantity}`, className: 'text-green-700' };
    if (outgoing) return { text: `−${movement.quantity}`, className: 'text-red-700' };
    return { text: String(movement.quantity), className: '' };
  };

  const locationText = (movement: StockMovement) => {
    if (movement.fromLocationId && movement.toLocationId) {
      return `${labelFor(movement.fromLocationId)} → ${labelFor(movement.toLocationId)}`;
    }
    return labelFor(movement.toLocationId ?? movement.fromLocationId);
  };

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {t('The latest 200 stock movements. This history is the source of truth for stock quantities.')}
        </p>
        <div className="flex gap-2">
          <Select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="sm:w-64"
            aria-label={t('Filter by location')}
          >
            <option value="">{t('All locations')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
          {canAdjust && (
            <Button variant="outline" onClick={() => setRebuilding(true)}>
              <DatabaseZap className="h-4 w-4" />
              {t('Check stock')}
            </Button>
          )}
        </div>
      </div>
      {rebuilding && <InventoryRebuildDialog onClose={() => setRebuilding(false)} />}

      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load stock movements')}</ErrorMessage>
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <Th>{t('Date')}</Th>
            <Th>{t('Type')}</Th>
            <Th>{t('Product')}</Th>
            <Th>{t('Location')}</Th>
            <Th className="text-right">{t('Quantity')}</Th>
            <Th>{t('Reference')}</Th>
            <Th>{t('Notes')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading movements...')}</EmptyRow>
          ) : movements.length === 0 ? (
            <EmptyRow colSpan={7}>{t('No stock movements yet.')}</EmptyRow>
          ) : (
            movements.map((movement) => {
              const quantity = signedQuantity(movement);
              const variantName = text(movement.variant?.name);
              return (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-gray-600">{formatDateTime(movement.movementDate)}</Td>
                  <Td>
                    <Badge>{movementLabels[movement.movementType] ? t(movementLabels[movement.movementType]) : movement.movementType}</Badge>
                  </Td>
                  <Td>
                    <div className="font-medium">{text(movement.variant?.product?.name, '—')}</div>
                    <div className="text-xs text-gray-500">
                      {variantName && `${variantName} · `}
                      <span className="font-mono">{movement.variant?.sku}</span>
                    </div>
                  </Td>
                  <Td className="text-gray-600">{locationText(movement)}</Td>
                  <Td className={cn('text-right font-medium', quantity.className)}>{quantity.text}</Td>
                  <Td className="font-mono text-xs">{movement.referenceNumber ?? '—'}</Td>
                  <Td className="max-w-xs text-gray-600">
                    {movement.movementType === 'revaluation' && (
                      <RevaluationSummary movement={movement} currency={currency} />
                    )}
                    <div className="truncate" title={movement.notes ?? undefined}>
                      {movement.notes ?? '—'}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>
    </Card>
  );
}

// Before → after unit cost of a revaluation (the valuation is left out without inventory.cost.view)
function RevaluationSummary({ movement, currency }: { movement: StockMovement; currency: string }) {
  const metadata = movement.metadata;
  const valuation = metadata?.valuation;
  return (
    <div className="text-xs">
      {metadata?.kind === 'costing_method_change' ? t('Costing method change') : t('Manual revaluation')}
      {valuation && (
        <>
          {': '}
          <span className="font-medium text-gray-800">
            {valuation.beforeCost == null ? '—' : formatMoney(valuation.beforeCost, currency)} →{' '}
            {formatMoney(valuation.afterCost, currency)}
          </span>{' '}
          <span className={cn(valuation.valueChange < 0 ? 'text-red-700' : 'text-green-700')}>
            ({valuation.valueChange >= 0 ? '+' : ''}
            {formatMoney(valuation.valueChange, currency)})
          </span>
        </>
      )}
    </div>
  );
}
