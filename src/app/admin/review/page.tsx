'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, THead, TBody, Th, Td, EmptyRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field, PageHeader } from '@/components/admin/page-header';
import { SaleDetailDialog } from '@/components/admin/sales-detail-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { ConflictCase, ConflictCaseStatus, ConflictCaseType, conflictCasesApi } from '@/lib/api/sales';
import { LEASE_ISSUE_LABELS } from '@/lib/api/sync';
import { formatDateTime } from '@/lib/format';
import { hasAnyPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

const PAGE_SIZE = 25;

const TYPE_LABELS: Record<ConflictCaseType, string> = {
  offline_oversell: 'Sold offline beyond stock',
  offline_price: 'Offline discount or price not approved',
  late_shift: 'Uploaded after its shift closed',
  offline_lease: "Sold offline outside the till's lease",
  lost_device: 'Till marked lost',
  offline_no_shift: 'Sold offline with no shift open',
};

/**
 * Review queue: sales the system accepted but someone must check. An offline
 * oversell (D018) is usually fixed with a stock count or an adjustment of the
 * items listed, then resolved here with a note.
 */
export default function ReviewQueuePage() {
  const user = useAuthStore((s) => s.user);
  const canAdjust = hasAnyPermission(user, 'inventory.adjust', 'inventory.count');
  const [status, setStatus] = useState<ConflictCaseStatus | ''>('open');
  const [type, setType] = useState<ConflictCaseType | ''>('');
  const [page, setPage] = useState(1);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ConflictCase | null>(null);
  // ?deviceId=&type= from the sync dashboard (Admin → Devices)
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('type');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL after mount
    setDeviceId(params.get('deviceId'));
    if (fromUrl && fromUrl in TYPE_LABELS) setType(fromUrl as ConflictCaseType);
  }, []);

  const filters = {
    status: status || undefined,
    type: type || undefined,
    deviceId: deviceId ?? undefined,
    page,
    limit: PAGE_SIZE,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['conflict-cases', filters],
    queryFn: () => conflictCasesApi.list(filters),
    placeholderData: keepPreviousData,
  });
  const cases = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Review queue')}
        description={t(
          'Sales accepted while offline that need a check: items sold beyond the stock, discounts nobody approved. Fix the cause, then close the case with a note.'
        )}
        actions={
          canAdjust && (
            <Button variant="outline" asChild>
              <Link href="/admin/inventory">
                <Boxes className="h-4 w-4" />
                {t('Open inventory')}
              </Link>
            </Button>
          )
        }
      />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ConflictCaseStatus | '');
              setPage(1);
            }}
            className="sm:w-44"
            aria-label={t('Filter by status')}
          >
            <option value="open">{t('Open')}</option>
            <option value="resolved">{t('Resolved')}</option>
            <option value="dismissed">{t('Dismissed')}</option>
            <option value="">{t('All statuses')}</option>
          </Select>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as ConflictCaseType | '');
              setPage(1);
            }}
            className="sm:w-72"
            aria-label={t('Filter by type')}
          >
            <option value="">{t('All types')}</option>
            {(Object.keys(TYPE_LABELS) as ConflictCaseType[]).map((key) => (
              <option key={key} value={key}>
                {t(TYPE_LABELS[key])}
              </option>
            ))}
          </Select>
          {deviceId && (
            <Button variant="outline" onClick={() => setDeviceId(null)}>
              {t('One till only — show all')}
            </Button>
          )}
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load the review queue')}</ErrorMessage>
          </div>
        )}

        <Table className={isFetching && !isLoading ? 'opacity-60' : undefined}>
          <THead>
            <tr>
              <Th>{t('Opened')}</Th>
              <Th>{t('Type')}</Th>
              <Th>{t('Sale')}</Th>
              <Th>{t('Details')}</Th>
              <Th>{t('Status')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
            ) : cases.length === 0 ? (
              <EmptyRow colSpan={6}>
                {status === 'open' ? t('Nothing to review.') : t('No cases match your filters.')}
              </EmptyRow>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="align-top">
                  <Td className="whitespace-nowrap">{formatDateTime(c.openedAt)}</Td>
                  <Td>{t(TYPE_LABELS[c.type] ?? c.type)}</Td>
                  <Td className="font-mono text-xs">
                    {c.saleId ? (
                      <button type="button" className="text-blue-700 hover:underline" onClick={() => setSaleId(c.saleId)}>
                        {c.sale?.saleNumber ?? c.details.saleNumber ?? t('Sale')}
                      </button>
                    ) : (
                      '—'
                    )}
                    {(c.sale?.offlineNumber ?? c.details.offlineNumber) && (
                      <div className="text-gray-500">{c.sale?.offlineNumber ?? c.details.offlineNumber}</div>
                    )}
                  </Td>
                  <Td className="text-sm">
                    <CaseDetails conflict={c} />
                  </Td>
                  <Td>
                    <Badge variant={c.status === 'open' ? 'warning' : c.status === 'resolved' ? 'success' : 'default'}>
                      {t(c.status === 'open' ? 'Open' : c.status === 'resolved' ? 'Resolved' : 'Dismissed')}
                    </Badge>
                    {c.resolutionNote && <div className="mt-1 text-xs text-gray-500">{c.resolutionNote}</div>}
                  </Td>
                  <Td className="text-right">
                    {c.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => setResolving(c)}>
                        <CheckCircle2 className="h-4 w-4" />
                        {t('Close case')}
                      </Button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>

        {meta && meta.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!meta.hasPreviousPage}>
                <ChevronLeft className="h-4 w-4" />
                {t('Previous')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNextPage}>
                {t('Next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <SaleDetailDialog saleId={saleId} onClose={() => setSaleId(null)} />
      <ResolveDialog conflict={resolving} onClose={() => setResolving(null)} />
    </div>
  );
}

function CaseDetails({ conflict }: { conflict: ConflictCase }) {
  const { details } = conflict;
  if (conflict.type === 'offline_oversell' && details.lines?.length) {
    return (
      <ul className="space-y-0.5">
        {details.lines.map((line) => (
          <li key={line.variantId}>
            {t('{product} ({sku}): {count} sold without stock', {
              product: line.productName,
              sku: line.sku,
              count: line.shortBy,
            })}
          </li>
        ))}
      </ul>
    );
  }
  if (conflict.type === 'offline_price' && details.reasons?.length) {
    return (
      <ul className="space-y-0.5">
        {details.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    );
  }
  if (conflict.type === 'offline_lease' && details.issues?.length) {
    return (
      <ul className="space-y-0.5">
        {details.issues.map((issue) => (
          <li key={issue}>{t(LEASE_ISSUE_LABELS[issue] ?? issue)}</li>
        ))}
      </ul>
    );
  }
  if (conflict.type === 'lost_device') {
    return (
      <ul className="space-y-0.5">
        {details.deviceName && <li>{details.deviceName}</li>}
        <li>{t('{count} sales not uploaded', { count: details.unsyncedSales ?? 0 })}</li>
        {details.lastSyncAt && (
          <li>{t('Last synced {date}', { date: formatDateTime(details.lastSyncAt) })}</li>
        )}
      </ul>
    );
  }
  return <span className="text-gray-400">—</span>;
}

function ResolveDialog({ conflict, onClose }: { conflict: ConflictCase | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (outcome: 'resolved' | 'dismissed') =>
      conflictCasesApi.resolve(conflict!.id, { status: outcome, note: note.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflict-cases'] });
      close();
    },
  });

  const close = () => {
    setNote('');
    setNoteError(null);
    mutation.reset();
    onClose();
  };

  const submit = (outcome: 'resolved' | 'dismissed') => {
    if (!note.trim()) {
      setNoteError(t('A note is required'));
      return;
    }
    setNoteError(null);
    mutation.mutate(outcome);
  };

  return (
    <Dialog open={!!conflict} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Close case')}</DialogTitle>
          <DialogDescription>
            {conflict?.type === 'offline_oversell'
              ? t('Count or adjust the stock of the items listed first, then say what was done.')
              : t('Say what was checked or done.')}
          </DialogDescription>
        </DialogHeader>
        <Field label={t('Note')} htmlFor="case-note" error={noteError ?? undefined}>
          <Textarea
            id="case-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('e.g. Shelf counted, 2 units found in the back room')}
            autoFocus
          />
        </Field>
        {mutation.error && <ErrorMessage>{getErrorMessage(mutation.error, 'Could not close the case')}</ErrorMessage>}
        <DialogFooter>
          <Button variant="outline" onClick={() => submit('dismissed')} disabled={mutation.isPending}>
            {t('Dismiss (nothing to do)')}
          </Button>
          <Button
            onClick={() => submit('resolved')}
            disabled={mutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {mutation.isPending ? t('Saving...') : t('Mark resolved')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
