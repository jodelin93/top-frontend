'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { EstimateFormDialog } from '@/components/admin/estimate-form-dialog';
import { EstimateDetailDialog } from '@/components/admin/estimate-detail-dialog';
import { EstimateStatusBadge } from '@/components/admin/estimate-status-badge';
import { Estimate, estimateCustomerName, estimatesApi, EstimateStatus } from '@/lib/api/estimates';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { t, plural } from '@/i18n';

export default function EstimatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<EstimateStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ estimate: Estimate | null } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['estimates', debounced, status, page],
    queryFn: () => estimatesApi.list({ search: debounced || undefined, status: status || undefined, page, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Estimates')}
        description={t(
          'Price quotes for customers. Print or send them, then sell an accepted estimate at the till at the quoted prices.'
        )}
        actions={
          <Button onClick={() => setEditing({ estimate: null })}>
            <Plus className="h-4 w-4" />
            {t('New estimate')}
          </Button>
        }
      />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by estimate number or customer...')}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as EstimateStatus | '');
              setPage(1);
            }}
            className="sm:w-48"
            aria-label={t('Status')}
          >
            <option value="">{t('All statuses')}</option>
            <option value="draft">{t('Draft')}</option>
            <option value="sent">{t('Sent')}</option>
            <option value="accepted">{t('Accepted')}</option>
            <option value="declined">{t('Declined')}</option>
            <option value="converted">{t('Sold')}</option>
          </Select>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load estimates')}</ErrorMessage>
          </div>
        )}

        <Table>
          <THead>
            <tr>
              <Th>{t('Estimate')}</Th>
              <Th>{t('Customer')}</Th>
              <Th>{t('Date')}</Th>
              <Th>{t('Valid until')}</Th>
              <Th className="text-right">{t('Total')}</Th>
              <Th>{t('Status')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={6}>{debounced || status ? t('No estimates match.') : t('No estimates yet.')}</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setViewingId(row.id)}>
                  <Td className="font-mono text-xs">
                    <button className="hover:underline" onClick={() => setViewingId(row.id)}>
                      {row.estimateNumber}
                    </button>
                  </Td>
                  <Td>{estimateCustomerName(row)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(`${row.issueDate}T00:00:00`)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(`${row.validUntil}T00:00:00`)}</Td>
                  <Td className="text-right">{formatMoney(Number(row.total), row.currencyCode)}</Td>
                  <Td>
                    <EstimateStatusBadge estimate={row} />
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3 text-sm text-gray-600">
            <span>
              {t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })} ·{' '}
              {plural(meta.total, '{count} estimate', '{count} estimates')}
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

      <EstimateFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        estimate={editing?.estimate ?? null}
        onSaved={(saved) => {
          queryClient.invalidateQueries({ queryKey: ['estimates'] });
          queryClient.setQueryData(['estimate', saved.id], saved);
          setViewingId(saved.id);
        }}
      />
      <EstimateDetailDialog
        estimateId={viewingId}
        onClose={() => setViewingId(null)}
        onOpen={setViewingId}
        onEdit={(estimate) => {
          setViewingId(null);
          setEditing({ estimate });
        }}
      />
    </div>
  );
}
