'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { auditApi, AuditLogEntry } from '@/lib/api/audit';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { plural, t } from '@/i18n';

// Common event families for the filter (labels translated where shown); the search box matches any action prefix
const ACTION_FILTERS = [
  { value: '', label: 'All events' },
  { value: 'sale.', label: 'Sales (voids)' },
  { value: 'refund', label: 'Refunds & returns' },
  { value: 'user.', label: 'Users' },
  { value: 'role.', label: 'Roles' },
  { value: 'approval.', label: 'Manager approvals' },
  { value: 'settings.', label: 'Settings' },
  { value: 'product.', label: 'Products' },
  { value: 'price_list.', label: 'Price lists' },
  { value: 'inventory.', label: 'Inventory' },
  { value: 'shift.', label: 'Shifts & cash' },
];

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', action, debounced, page],
    queryFn: () =>
      auditApi.list({
        action: debounced || action || undefined,
        page,
        limit: 50,
      }),
    placeholderData: (previous) => previous,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Audit log')}
        description={t("Every sensitive change: who did it, who approved it, and what changed. Entries can't be edited or deleted.")}
      />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Filter by action, e.g. sale.voided')}
              className="pl-10"
            />
          </div>
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="sm:w-56"
            aria-label={t('Event type')}
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {t(f.label)}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load the audit log')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per event (tap for the details) instead of a table that scrolls sideways
          <DataCards
            items={rows}
            getKey={(row) => row.id}
            onItemClick={(row) => setExpanded(expanded === row.id ? null : row.id)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No events match.')}
          >
            {(row) => (
              <>
                <DataCardHeader
                  title={
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      {expanded === row.id ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      {row.action}
                    </span>
                  }
                  subtitle={formatDateTime(row.createdAt)}
                  onTitleClick={() => setExpanded(expanded === row.id ? null : row.id)}
                />
                <DataCardFields>
                  <DataCardField label={t('Who')}>{row.actorName ?? t('System')}</DataCardField>
                  <DataCardField label={t('Approved by')}>{row.approverName ?? '—'}</DataCardField>
                  <DataCardField label={t('Target')} full>
                    <span className="text-xs text-gray-600">
                      {row.entityType}
                      {row.entityId && <span className="block break-all font-mono">{row.entityId}</span>}
                    </span>
                  </DataCardField>
                  {row.reason && (
                    <DataCardField label={t('Reason')} full>
                      {row.reason}
                    </DataCardField>
                  )}
                </DataCardFields>
                {expanded === row.id && (
                  <div className="rounded-md bg-gray-50 p-3">
                    <AuditDetails row={row} />
                  </div>
                )}
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-8" />
              <Th>{t('When')}</Th>
              <Th>{t('Action')}</Th>
              <Th>{t('Who')}</Th>
              <Th>{t('Approved by')}</Th>
              <Th>{t('Target')}</Th>
              <Th>{t('Reason')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={7}>{t('Loading...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7}>{t('No events match.')}</EmptyRow>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <Td>{expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</Td>
                    <Td className="font-mono text-xs">{row.action}</Td>
                    <Td>{row.actorName ?? t('System')}</Td>
                    <Td>{row.approverName ?? '—'}</Td>
                    <Td className="text-xs text-gray-600">
                      {row.entityType}
                      {row.entityId && <span className="block font-mono">{row.entityId}</span>}
                    </Td>
                    <Td className="max-w-xs truncate">{row.reason ?? '—'}</Td>
                  </tr>
                  {expanded === row.id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-4 py-3">
                        <AuditDetails row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </TBody>
        </Table>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3 text-sm text-gray-600">
            <span>
              {t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })} ·{' '}
              {plural(meta.total, '{count} event', '{count} events')}
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
    </div>
  );
}

function AuditDetails({ row }: { row: AuditLogEntry }) {
  const before = (row.changes as { before?: unknown } | null)?.before;
  const after = (row.changes as { after?: unknown } | null)?.after;
  const hasMetadata = Object.keys(row.metadata ?? {}).length > 0;

  return (
    <div className="space-y-2 text-xs">
      <div className="break-all text-gray-500">
        {t('IP {ip} · request {request}', { ip: row.ip ?? '—', request: row.requestId ?? '—' })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {before !== undefined && <JsonBlock title={t('Before')} value={before} />}
        {after !== undefined && <JsonBlock title={t('After')} value={after} />}
        {hasMetadata && <JsonBlock title={t('Details')} value={row.metadata} />}
      </div>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-semibold">{title}</div>
      <pre className="max-h-64 overflow-auto rounded border bg-white p-2">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
