'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { DataCardField, DataCardFields, DataCardHeader, DataCards, useSmallScreen } from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { OrderDetail } from '@/components/orders/order-detail';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderTicketDialog } from '@/components/pos/order-ticket';
import { Order, orderCustomerName, ordersApi, OrderStatus } from '@/lib/api/orders';
import { paymentMethodsApi, registersApi } from '@/lib/api/settings';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { plural, t } from '@/i18n';

/**
 * Orders with a deposit: services prepared for customers who pay the rest at
 * pickup. Picked up at the till (Orders); here they are followed, printed,
 * marked ready, given another deposit or cancelled.
 */
export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'active' | ''>('active');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ order: Order; title?: string } | null>(null);
  const smallScreen = useSmallScreen();
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'admin', debounced, status, page],
    queryFn: () => ordersApi.list({ search: debounced || undefined, status: status || undefined, page, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: !!viewingId,
  });
  const { data: registers = [] } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
    enabled: !!viewingId,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const money = (order: Order, value: number) => formatMoney(Number(value), order.currencyCode);
  const empty = debounced || status ? t('No orders match.') : t('No orders yet.');

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Orders')}
        description={t(
          'Services prepared for customers who paid a deposit. They are taken and picked up at the till (Orders); the sale is counted at pickup.'
        )}
      />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Order number, customer name or phone...')}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | 'active' | '');
              setPage(1);
            }}
            className="sm:w-56"
            aria-label={t('Status')}
          >
            <option value="active">{t('Waiting for the customer')}</option>
            <option value="open">{t('In preparation')}</option>
            <option value="ready">{t('Ready')}</option>
            <option value="picked_up">{t('Picked up')}</option>
            <option value="cancelled">{t('Cancelled')}</option>
            <option value="">{t('All statuses')}</option>
          </Select>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load the orders')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          <DataCards
            items={rows}
            getKey={(row) => row.id}
            onItemClick={(row) => setViewingId(row.id)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={empty}
          >
            {(row) => (
              <>
                <DataCardHeader
                  title={<span className="font-mono text-xs">{row.orderNumber}</span>}
                  subtitle={orderCustomerName(row)}
                  onTitleClick={() => setViewingId(row.id)}
                  badge={<OrderStatusBadge status={row.status} />}
                />
                <DataCardFields>
                  <DataCardField label={t('Total')}>
                    <span className="font-medium">{money(row, row.total)}</span>
                  </DataCardField>
                  <DataCardField label={t('Deposits paid')}>{money(row, row.paidAmount)}</DataCardField>
                  <DataCardField label={t('Balance due')}>{money(row, row.balanceDue)}</DataCardField>
                  <DataCardField label={t('Ready by')}>{row.readyBy ? formatDate(row.readyBy) : '—'}</DataCardField>
                </DataCardFields>
              </>
            )}
          </DataCards>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Order')}</Th>
                <Th>{t('Customer')}</Th>
                <Th>{t('Branch')}</Th>
                <Th>{t('Ready by')}</Th>
                <Th className="text-right">{t('Total')}</Th>
                <Th className="text-right">{t('Deposits paid')}</Th>
                <Th className="text-right">{t('Balance due')}</Th>
                <Th>{t('Status')}</Th>
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={8}>{empty}</EmptyRow>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setViewingId(row.id)}>
                    <Td className="font-mono text-xs">{row.orderNumber}</Td>
                    <Td>
                      {orderCustomerName(row)}
                      {row.customer?.phone && <span className="block text-xs text-gray-500">{row.customer.phone}</span>}
                    </Td>
                    <Td>{row.branch?.name ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{row.readyBy ? formatDate(row.readyBy) : '—'}</Td>
                    <Td className="text-right tabular-nums">{money(row, row.total)}</Td>
                    <Td className="text-right tabular-nums">{money(row, row.paidAmount)}</Td>
                    <Td className="text-right tabular-nums">
                      {row.status === 'open' || row.status === 'ready' ? money(row, row.balanceDue) : '—'}
                    </Td>
                    <Td>
                      <OrderStatusBadge status={row.status} />
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3 text-sm text-gray-600">
            <span>
              {t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })} ·{' '}
              {plural(meta.total, '{count} order', '{count} orders')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage(page - 1)}>
                {t('Previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage(page + 1)}>
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!viewingId} onOpenChange={(open) => !open && setViewingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Order')}</DialogTitle>
            <DialogDescription>{t('Picked up at the till: Orders, then “Pick up”.')}</DialogDescription>
          </DialogHeader>
          {viewingId && (
            <div className="max-h-[70vh] overflow-y-auto">
              <OrderDetail
                orderId={viewingId}
                paymentMethods={methods.filter((m) => m.status === 'active')}
                registers={registers.map((r) => ({ id: r.id, name: r.name, branchId: r.branchId }))}
                onPrint={(order, title) => {
                  setViewingId(null);
                  setTicket({ order, title });
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <OrderTicketDialog
        order={ticket?.order ?? null}
        title={ticket?.title}
        autoPrint={false}
        settings={settings}
        onClose={() => setTicket(null)}
      />
    </div>
  );
}
