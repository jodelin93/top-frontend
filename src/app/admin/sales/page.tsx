'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Table, THead, TBody, Th, Td, EmptyRow } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import {
  DateRange,
  DateRangeFilter,
  endOfDayIso,
  presetRange,
  startOfDayIso,
} from '@/components/admin/reports-date-range';
import { SaleDetailDialog } from '@/components/admin/sales-detail-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { customerName } from '@/lib/api/customers';
import { Sale, SaleStatus, salesApi } from '@/lib/api/sales';
import { formatDateTime, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

const PAGE_SIZE = 25;

const cashierName = (user: Sale['user']) =>
  user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : '—';

export default function SalesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<SaleStatus | ''>('');
  const [range, setRange] = useState<DateRange>(() => presetRange('all'));
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  // Debounce search typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const filters = {
    from: range.from ? startOfDayIso(range.from) : undefined,
    to: range.to ? endOfDayIso(range.to) : undefined,
    status: status || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['sales', filters],
    queryFn: () => salesApi.list(filters),
    // Keep the current page visible while the next one loads
    placeholderData: keepPreviousData,
  });

  const sales = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!(debouncedSearch || status || range.from || range.to);

  const handleRange = (next: DateRange) => {
    setRange(next);
    setPage(1);
  };

  const handleStatus = (next: SaleStatus | '') => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader title={t('Sales')} description={t('Browse past sales, reprint receipts and void mistakes.')} />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Search by sale number or offline number...')}
              aria-label={t('Search by sale number or offline number')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => handleStatus(e.target.value as SaleStatus | '')}
            className="lg:w-40"
            aria-label={t('Filter by status')}
          >
            <option value="">{t('All statuses')}</option>
            <option value="completed">{t('Completed')}</option>
            <option value="voided">{t('Voided')}</option>
            <option value="payment_pending">{t('Payment pending')}</option>
            <option value="held">{t('Held')}</option>
            <option value="cancelled">{t('Cancelled')}</option>
          </Select>
          <DateRangeFilter
            value={range}
            onChange={handleRange}
            presets={['all', 'today', 'yesterday', '7d', '30d', 'month']}
          />
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load sales')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per sale instead of a table that scrolls sideways
          <DataCards
            items={sales}
            getKey={(sale) => sale.id}
            onItemClick={(sale) => setSelectedId(sale.id)}
            loading={isLoading}
            loadingText={t('Loading sales...')}
            emptyText={hasFilters ? t('No sales match your filters.') : t('No sales yet.')}
            className={isFetching && !isLoading ? 'opacity-60' : undefined}
          >
            {(sale) => (
              <>
                <DataCardHeader
                  title={<span className="font-mono text-xs">{sale.saleNumber}</span>}
                  subtitle={sale.offlineNumber || undefined}
                  onTitleClick={() => setSelectedId(sale.id)}
                  badge={<Badge variant={statusVariant(sale.status)}>{t(sale.status.replace('_', ' '))}</Badge>}
                />
                <DataCardFields>
                  <DataCardField label={t('Date')}>{formatDateTime(sale.saleDate)}</DataCardField>
                  <DataCardField label={t('Total')}>
                    <span className="font-medium">{formatMoney(sale.total, sale.currencyCode)}</span>
                  </DataCardField>
                  <DataCardField label={t('Customer')}>
                    {sale.customer ? customerName(sale.customer) : <span className="text-gray-400">{t('Walk-in')}</span>}
                  </DataCardField>
                  <DataCardField label={t('Cashier')}>{cashierName(sale.user)}</DataCardField>
                </DataCardFields>
              </>
            )}
          </DataCards>
        ) : (
        <Table className={isFetching && !isLoading ? 'opacity-60' : undefined}>
          <THead>
            <tr>
              <Th>{t('Sale')}</Th>
              <Th>{t('Date')}</Th>
              <Th>{t('Customer')}</Th>
              <Th>{t('Cashier')}</Th>
              <Th className="text-right">{t('Total')}</Th>
              <Th>{t('Status')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={6}>{t('Loading sales...')}</EmptyRow>
            ) : sales.length === 0 ? (
              <EmptyRow colSpan={6}>
                {hasFilters ? t('No sales match your filters.') : t('No sales yet.')}
              </EmptyRow>
            ) : (
              sales.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => setSelectedId(sale.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <Td className="font-mono text-xs font-medium">
                    {/* Real button so rows are reachable by keyboard */}
                    <button type="button" className="hover:underline" onClick={() => setSelectedId(sale.id)}>
                      {sale.saleNumber}
                    </button>
                    {sale.offlineNumber && (
                      <div className="font-normal text-gray-500" title={t('Number printed while offline')}>
                        {sale.offlineNumber}
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(sale.saleDate)}</Td>
                  <Td>{sale.customer ? customerName(sale.customer) : <span className="text-gray-400">{t('Walk-in')}</span>}</Td>
                  <Td>
                    {cashierName(sale.user)}
                    {sale.salesperson && (
                      <div className="text-xs text-gray-500">
                        {t('Salesperson: {name}', { name: cashierName(sale.salesperson) })}
                      </div>
                    )}
                  </Td>
                  <Td className="text-right">{formatMoney(sale.total, sale.currencyCode)}</Td>
                  <Td>
                    <Badge variant={statusVariant(sale.status)}>{t(sale.status.replace('_', ' '))}</Badge>
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-gray-500">
            <span>
              {t('{start}–{end} of {total}', {
                start: (meta.page - 1) * PAGE_SIZE + 1,
                end: Math.min(meta.page * PAGE_SIZE, meta.total),
                total: meta.total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!meta.hasPreviousPage || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('Previous')}
              </Button>
              <span>
                {t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage || isFetching}
              >
                {t('Next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <SaleDetailDialog saleId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
