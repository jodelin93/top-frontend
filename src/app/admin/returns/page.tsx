'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { NewReturnDialog } from '@/components/admin/returns-new-dialog';
import { ReturnReceipt } from '@/components/admin/returns-receipt';
import { IncompleteExchanges } from '@/components/admin/returns-exchange';
import { returnsApi, ReturnStatus } from '@/lib/api/returns';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t, plural } from '@/i18n';

// English labels, translated at render
const typeLabel: Record<string, string> = { goodwill: 'Goodwill', exchange: 'Exchange' };

const statusLabel: Record<ReturnStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  completed: { label: 'Refunded', variant: 'success' },
  refund_pending: { label: 'Refund pending', variant: 'warning' },
  refund_failed: { label: 'Refund failed', variant: 'danger' },
};

export default function ReturnsPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <ReturnsScreen />
    </Suspense>
  );
}

function ReturnsScreen() {
  const searchParams = useSearchParams();
  const saleFromLink = searchParams.get('sale') ?? undefined;
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<ReturnStatus | ''>('');
  const [page, setPage] = useState(1);
  // Opening from a sale ("Return items" in the sales history) starts a return right away
  const [creating, setCreating] = useState(!!saleFromLink);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['returns', debounced, status, page],
    queryFn: () => returnsApi.list({ search: debounced || undefined, status: status || undefined, page, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Returns')}
        description={t('Take items back from earlier sales and refund the customer. Restocked items go back into inventory.')}
        actions={
          hasPermission(user, 'sales.refund') && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t('New return')}
            </Button>
          )
        }
      />

      {hasPermission(user, 'sales.view') && <IncompleteExchanges />}

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by return or sale number...')}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReturnStatus | '');
              setPage(1);
            }}
            className="sm:w-48"
            aria-label={t('Status')}
          >
            <option value="">{t('All statuses')}</option>
            <option value="completed">{t('Refunded')}</option>
            <option value="refund_pending">{t('Refund pending')}</option>
            <option value="refund_failed">{t('Refund failed')}</option>
          </Select>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load returns')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          <DataCards
            items={rows}
            getKey={(row) => row.id}
            onItemClick={(row) => setViewingId(row.id)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={debounced || status ? t('No returns match.') : t('No returns yet.')}
          >
            {(row) => (
              <>
                <DataCardHeader
                  title={<span className="font-mono text-xs">{row.returnNumber}</span>}
                  onTitleClick={() => setViewingId(row.id)}
                  badge={
                    <>
                      {row.returnType && typeLabel[row.returnType] && (
                        <Badge variant="default">{t(typeLabel[row.returnType])}</Badge>
                      )}
                      <Badge variant={statusLabel[row.status].variant}>{t(statusLabel[row.status].label)}</Badge>
                    </>
                  }
                />
                <DataCardFields>
                  <DataCardField label={t('Date')}>{formatDateTime(row.createdAt)}</DataCardField>
                  <DataCardField label={t('Refund')}>
                    <span className="font-medium">{formatMoney(row.total, row.currencyCode)}</span>
                  </DataCardField>
                  <DataCardField label={t('Original sale')}>
                    <span className="font-mono text-xs">{row.originalSale?.saleNumber ?? '—'}</span>
                  </DataCardField>
                  {row.reason && (
                    <DataCardField label={t('Reason')} full>
                      {row.reason}
                    </DataCardField>
                  )}
                </DataCardFields>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Return')}</Th>
              <Th>{t('Date')}</Th>
              <Th>{t('Original sale')}</Th>
              <Th>{t('Reason')}</Th>
              <Th className="text-right">{t('Refund')}</Th>
              <Th>{t('Status')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={6}>{debounced || status ? t('No returns match.') : t('No returns yet.')}</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setViewingId(row.id)}>
                  <Td className="font-mono text-xs">
                    <button className="hover:underline" onClick={() => setViewingId(row.id)}>
                      {row.returnNumber}
                    </button>
                    {row.returnType && typeLabel[row.returnType] && (
                      <Badge className="ml-2" variant="default">
                        {t(typeLabel[row.returnType])}
                      </Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</Td>
                  <Td className="font-mono text-xs">{row.originalSale?.saleNumber ?? '—'}</Td>
                  <Td className="max-w-xs truncate">{row.reason}</Td>
                  <Td className="text-right">{formatMoney(row.total, row.currencyCode)}</Td>
                  <Td>
                    <Badge variant={statusLabel[row.status].variant}>{t(statusLabel[row.status].label)}</Badge>
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
              {plural(meta.total, '{count} return', '{count} returns')}
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

      <NewReturnDialog open={creating} onOpenChange={setCreating} initialSaleNumber={saleFromLink} />
      <ReturnDetailDialog returnId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}

function ReturnDetailDialog({ returnId, onClose }: { returnId: string | null; onClose: () => void }) {
  // Credit note prints are recorded; after the first one they print as COPY
  const printer = usePrintDocument();
  const queryClient = useQueryClient();
  const { data: settings } = useStoreSettings();
  const { data: saleReturn, error } = useQuery({
    queryKey: ['return', returnId],
    queryFn: () => returnsApi.get(returnId!),
    enabled: !!returnId,
  });

  const retry = useMutation({
    mutationFn: () => returnsApi.retryRefunds(returnId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
    },
  });

  return (
    <Dialog open={!!returnId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{saleReturn?.returnNumber ?? t('Return')}</DialogTitle>
        </DialogHeader>
        <ErrorMessage>
          {error ? getErrorMessage(error, 'Could not load the return') : retry.error ? getErrorMessage(retry.error, 'Retry failed') : null}
        </ErrorMessage>
        {saleReturn?.refunds?.some((r) => r.failureReason) && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {saleReturn.refunds
              .filter((r) => r.failureReason)
              .map((r) => (
                <div key={r.id}>{r.failureReason}</div>
              ))}
          </div>
        )}
        <div className="max-h-[55vh] overflow-y-auto rounded-md border p-4">
          {saleReturn && <ReturnReceipt saleReturn={saleReturn} settings={settings} copy={printer.copy} />}
        </div>
        <ErrorMessage>{printer.error}</ErrorMessage>
        <DialogFooter>
          {saleReturn && saleReturn.status !== 'completed' && (
            <Button variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
              <RefreshCw className={`h-4 w-4 ${retry.isPending ? 'animate-spin' : ''}`} />
              {t('Retry card refund')}
            </Button>
          )}
          <Button onClick={() => saleReturn && printer.print('credit_note', saleReturn.id)}>
            <Printer className="h-4 w-4" />
            {t('Print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
