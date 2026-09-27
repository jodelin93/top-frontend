'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage } from '@/components/admin/page-header';
import { useDebouncedValue, useStockLocationOptions } from '@/components/admin/inventory-variant-picker';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { AgingBucketKey, inventoryApi, LocationStockStatus } from '@/lib/api/inventory';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

export const agingBucketLabels: Record<AgingBucketKey, string> = {
  '0-30': '0–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '91-180': '91–180 days',
  '181+': 'Over 180 days',
  unknown: 'Unknown',
};

const bucketTone: Record<AgingBucketKey, string> = {
  '0-30': 'border-green-200',
  '31-60': 'border-lime-200',
  '61-90': 'border-amber-200',
  '91-180': 'border-orange-300',
  '181+': 'border-red-300',
  unknown: 'border-gray-200',
};

const statusLabels: Record<LocationStockStatus, string> = {
  sellable: 'Sellable',
  quarantine: 'Quarantine',
  damaged: 'Damaged',
  transit: 'In transit',
};

/**
 * Stock aging: how long stock has been sitting at each location (days since
 * its last receipt there), oldest first, with totals per age bucket
 */
export function AgingTab() {
  const currency = useCurrency();
  const { options: locations, labelFor } = useStockLocationOptions();
  const [locationId, setLocationId] = useState('');
  const [search, setSearch] = useState('');
  const [minDays, setMinDays] = useState('');
  const smallScreen = useSmallScreen();
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedMinDays = useDebouncedValue(minDays.trim());
  const minDaysValue = /^\d+$/.test(debouncedMinDays) ? Number(debouncedMinDays) : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'aging', locationId, debouncedSearch, minDaysValue],
    queryFn: () =>
      inventoryApi.aging({
        locationId: locationId || undefined,
        search: debouncedSearch || undefined,
        minDays: minDaysValue,
      }),
  });

  const buckets = data?.buckets ?? [];
  // Oldest first (unknown age last)
  const items = [...(data?.items ?? [])].sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
  // Values are left out for users who may not see costs
  const showValue = items.length
    ? items.some((i) => i.stockValue !== undefined)
    : buckets.some((b) => b.stockValue !== undefined);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {buckets.map((bucket) => (
          <Card key={bucket.key} className={cn('border-l-4 bg-white p-3', bucketTone[bucket.key])}>
            <div className="text-xs text-gray-500">{t(agingBucketLabels[bucket.key])}</div>
            <div className="text-lg font-semibold">{plural(bucket.quantity, '{count} unit', '{count} units')}</div>
            <div className="text-xs text-gray-500">
              {plural(bucket.lines, '{count} line', '{count} lines')}
              {showValue && bucket.stockValue !== undefined && ` · ${formatMoney(bucket.stockValue, currency)}`}
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Search by name or SKU...')}
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
          <Input
            inputMode="numeric"
            value={minDays}
            onChange={(e) => setMinDays(e.target.value)}
            placeholder={t('Min. days')}
            aria-label={t('At least this many days old')}
            className="lg:w-32"
          />
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load stock aging')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per product and location, the age up front
          <DataCards
            items={items}
            getKey={(item) => `${item.variantId}-${item.locationId}`}
            loading={isLoading}
            loadingText={t('Loading stock aging...')}
            emptyText={t('No stock matches your filters.')}
          >
            {(item) => {
              const variantName = text(item.variantName);
              return (
                <>
                  <DataCardHeader
                    title={text(item.productName, '—')}
                    subtitle={
                      <>
                        {variantName && `${variantName} · `}
                        <span className="font-mono">{item.sku}</span>
                      </>
                    }
                    badge={
                      item.stockStatus &&
                      item.stockStatus !== 'sellable' && <Badge variant="warning">{t(statusLabels[item.stockStatus])}</Badge>
                    }
                  />
                  <DataCardFields>
                    <DataCardField label={t('Location')} full>
                      {labelFor(item.locationId, item.locationName || item.locationCode)}
                    </DataCardField>
                    <DataCardField label={t('Days')}>
                      <span
                        className={cn(
                          'font-medium',
                          item.days !== null && item.days > 180 && 'text-red-700',
                          item.days !== null && item.days > 90 && item.days <= 180 && 'text-amber-700'
                        )}
                      >
                        {item.days ?? '—'}
                      </span>
                    </DataCardField>
                    <DataCardField label={t('On hand')}>{item.quantityOnHand}</DataCardField>
                    <DataCardField label={t('Aged from')}>{formatDate(item.agedFrom)}</DataCardField>
                    {showValue && (
                      <DataCardField label={t('Stock value')}>
                        {item.stockValue == null ? '—' : formatMoney(item.stockValue, currency)}
                      </DataCardField>
                    )}
                  </DataCardFields>
                </>
              );
            }}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Product')}</Th>
              <Th>{t('SKU')}</Th>
              <Th>{t('Location')}</Th>
              <Th className="text-right">{t('On hand')}</Th>
              <Th>{t('Aged from')}</Th>
              <Th className="text-right">{t('Days')}</Th>
              {showValue && <Th className="text-right">{t('Stock value')}</Th>}
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={7}>{t('Loading stock aging...')}</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={7}>{t('No stock matches your filters.')}</EmptyRow>
            ) : (
              items.map((item) => {
                const variantName = text(item.variantName);
                return (
                  <tr key={`${item.variantId}-${item.locationId}`} className="hover:bg-gray-50">
                    <Td>
                      <div className="font-medium">{text(item.productName, '—')}</div>
                      {variantName && <div className="text-xs text-gray-500">{variantName}</div>}
                    </Td>
                    <Td className="font-mono text-xs">{item.sku}</Td>
                    <Td>
                      {labelFor(item.locationId, item.locationName || item.locationCode)}
                      {item.stockStatus && item.stockStatus !== 'sellable' && (
                        <Badge variant="warning" className="ml-2">
                          {t(statusLabels[item.stockStatus])}
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-right">{item.quantityOnHand}</Td>
                    <Td className="whitespace-nowrap text-gray-600">{formatDate(item.agedFrom)}</Td>
                    <Td
                      className={cn(
                        'text-right font-medium',
                        item.days !== null && item.days > 180 && 'text-red-700',
                        item.days !== null && item.days > 90 && item.days <= 180 && 'text-amber-700'
                      )}
                    >
                      {item.days ?? '—'}
                    </Td>
                    {showValue && (
                      <Td className="text-right">
                        {item.stockValue == null ? '—' : formatMoney(item.stockValue, currency)}
                      </Td>
                    )}
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
        )}
        <p className="border-t px-4 py-2 text-xs text-gray-500">
          {t(
            'Age is counted from the last supplier receipt at the location (else the first time the stock arrived there).'
          )}
        </p>
      </Card>
    </div>
  );
}
