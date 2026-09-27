'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, EyeOff, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, useLocationOptions } from '@/components/admin/settings-shared';
import { useApproval } from '@/components/approval-dialog';
import { useCurrency, useStoreSettings } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { categoriesApi } from '@/lib/api/categories';
import { StockCount, StockCountDetail, StockCountLine, StockCountStatus, stockCountsApi } from '@/lib/api/inventory';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';
import { QUANTITY_TEXT } from '@/lib/pos/quantity';

export const countStatusLabels: Record<StockCountStatus, string> = {
  in_progress: 'Counting',
  pending_approval: 'Needs approval',
  posted: 'Posted',
  cancelled: 'Cancelled',
};

const countStatusVariant: Record<StockCountStatus, 'info' | 'warning' | 'success' | 'default'> = {
  in_progress: 'info',
  pending_approval: 'warning',
  posted: 'success',
  cancelled: 'default',
};

/**
 * Stock count sessions: start a count for a location, enter counted quantities,
 * review variances and post (with approval above the store's tolerance).
 */
export function CountsTab() {
  const { options: locations, labelFor } = useLocationOptions();
  const [status, setStatus] = useState<StockCountStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const canCount = hasPermission(user, 'inventory.count');
  const smallScreen = useSmallScreen();

  const {
    data: counts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inventory', 'counts', status],
    queryFn: () => stockCountsApi.list({ status: status || undefined }),
    enabled: canCount,
  });

  if (!canCount) {
    return (
      <Card className="bg-white p-6 text-sm text-gray-500">
        {t('You need the "Run stock counts" permission to see count sessions.')}
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {t('Count a location (or one category), review the differences, then post them as recount adjustments.')}
        </p>
        <div className="flex gap-2">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StockCountStatus | '')}
            className="sm:w-44"
            aria-label={t('Filter by status')}
          >
            <option value="">{t('All statuses')}</option>
            {Object.entries(countStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => setCreating(true)}
            disabled={locations.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t('New count')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load stock counts')}</ErrorMessage>
        </div>
      )}

      {smallScreen ? (
        // Phones: one card per count session
        <DataCards
          items={counts}
          getKey={(count) => count.id}
          onItemClick={(count) => setOpenId(count.id)}
          loading={isLoading}
          loadingText={t('Loading counts...')}
          emptyText={t('No stock counts yet.')}
        >
          {(count) => (
            <>
              <DataCardHeader
                title={
                  <span className="font-mono text-xs">
                    {count.countNumber}
                    {count.blind && <EyeOff className="ml-1 inline h-3 w-3 text-gray-400" aria-label={t('Blind count')} />}
                  </span>
                }
                subtitle={labelFor(count.locationId, count.location?.code)}
                onTitleClick={() => setOpenId(count.id)}
                badge={<Badge variant={countStatusVariant[count.status]}>{t(countStatusLabels[count.status])}</Badge>}
              />
              <DataCardFields>
                <DataCardField label={t('Counted')}>
                  {count.countedCount ?? 0} / {count.lineCount ?? 0}
                </DataCardField>
                <DataCardField label={t('Started')}>{formatDateTime(count.createdAt)}</DataCardField>
                {count.postedAt && <DataCardField label={t('Posted')}>{formatDateTime(count.postedAt)}</DataCardField>}
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Count')}</Th>
            <Th>{t('Location')}</Th>
            <Th>{t('Status')}</Th>
            <Th className="text-right">{t('Counted')}</Th>
            <Th>{t('Started')}</Th>
            <Th>{t('Posted')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading counts...')}</EmptyRow>
          ) : counts.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No stock counts yet.')}</EmptyRow>
          ) : (
            counts.map((count) => (
              <tr key={count.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setOpenId(count.id)}>
                <Td className="font-mono text-xs font-medium">
                  {count.countNumber}
                  {count.blind && <EyeOff className="ml-1 inline h-3 w-3 text-gray-400" aria-label={t('Blind count')} />}
                </Td>
                <Td>{labelFor(count.locationId, count.location?.code)}</Td>
                <Td>
                  <Badge variant={countStatusVariant[count.status]}>{t(countStatusLabels[count.status])}</Badge>
                </Td>
                <Td className="text-right">
                  {count.countedCount ?? 0} / {count.lineCount ?? 0}
                </Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(count.createdAt)}</Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(count.postedAt)}</Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      {creating && (
        <NewCountDialog
          onClose={() => setCreating(false)}
          onCreated={(count) => {
            setCreating(false);
            setOpenId(count.id);
          }}
        />
      )}
      {openId && <CountSheetDialog key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </Card>
  );
}

function NewCountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (count: StockCount) => void }) {
  const queryClient = useQueryClient();
  const { options: locations } = useLocationOptions();
  const [locationId, setLocationId] = useState(locations.find((l) => l.isSellable)?.id ?? locations[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [blind, setBlind] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });

  const create = useMutation({
    mutationFn: stockCountsApi.create,
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: ['inventory', 'counts'] });
      onCreated(count);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not start the count')),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('New stock count')}</DialogTitle>
          <DialogDescription>
            {t(
              'Expected quantities are captured now. Differences are posted relative to this snapshot, so sales made while you count are kept.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!locationId) return setError(t('Choose a location.'));
            create.mutate({
              locationId,
              blind,
              ...(categoryId && { categoryId }),
              ...(notes.trim() && { notes: notes.trim() }),
            });
          }}
        >
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('Location')} htmlFor="count-location">
            <Select id="count-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">{t('Choose a location...')}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Category')} htmlFor="count-category" hint={t('Leave empty to count every product')}>
            <Select id="count-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('All products')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {text(c.name, c.code)}
                </option>
              ))}
            </Select>
          </Field>
          <CheckboxField
            label={t('Blind count')}
            hint={t('Hide expected quantities from counters until the count is submitted')}
            checked={blind}
            onChange={(e) => setBlind(e.target.checked)}
          />
          <Field label={t('Notes')} htmlFor="count-notes">
            <Textarea id="count-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('Starting...') : t('Start count')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const lineLabel = (line: StockCountLine) => {
  const variant = text(line.variantName);
  const product = text(line.productName, line.sku);
  return variant && variant !== product ? `${product} — ${variant}` : product;
};

function CountSheetDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const { data: settings } = useStoreSettings();
  const { labelFor } = useLocationOptions();
  // Without "Approve stock count variances", approving asks for another person's credentials
  const { withApproval, approvalDialog } = useApproval();
  const [search, setSearch] = useState('');
  // Unsaved entries: variantId → input text
  const [edits, setEdits] = useState<Record<string, string>>({});
  // Unsaved reasons: variantId → text
  const [reasonEdits, setReasonEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Idempotency keys of submit / approve, reused on retries; new ones once an action succeeds
  const [keys, setKeys] = useState(() => ({ submit: newIdempotencyKey(), approve: newIdempotencyKey() }));
  const smallScreen = useSmallScreen();

  const {
    data: count,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['inventory', 'counts', 'detail', id],
    queryFn: () => stockCountsApi.get(id),
  });

  const refresh = async (detail?: StockCountDetail) => {
    if (detail) queryClient.setQueryData(['inventory', 'counts', 'detail', id], detail);
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const dirty = Object.keys(edits).length > 0 || Object.keys(reasonEdits).length > 0;
  const editable = count?.status === 'in_progress';
  const tolerance = settings?.countVarianceTolerance ?? 0;

  const pendingEntries = () => {
    const items: { variantId: string; countedQuantity: number | null; reason?: string | null }[] = [];
    const byVariant = new Map((count?.items ?? []).map((line) => [line.variantId, line]));
    const variantIds = new Set([...Object.keys(edits), ...Object.keys(reasonEdits)]);
    for (const variantId of variantIds) {
      const line = byVariant.get(variantId);
      const value = edits[variantId] ?? (line?.countedQuantity == null ? '' : String(line.countedQuantity));
      const trimmed = value.trim().replace(',', '.');
      let countedQuantity: number | null;
      if (trimmed === '') {
        countedQuantity = null;
      } else if (QUANTITY_TEXT.test(trimmed)) {
        // Decimals for measured items; the server checks each unit's precision
        countedQuantity = Number(trimmed);
      } else {
        return t('Counted quantities must be 0 or more, with at most 4 decimals ({value}).', { value: trimmed });
      }
      const reason = reasonEdits[variantId];
      items.push({
        variantId,
        countedQuantity,
        // Omitted: kept as it is; empty: cleared
        ...(reason !== undefined && { reason: reason.trim() || null }),
      });
    }
    return items;
  };

  const action = useMutation({
    mutationFn: async (kind: 'save' | 'submit' | 'approve' | 'reject' | 'cancel') => {
      if (kind === 'save' || kind === 'submit') {
        const items = pendingEntries();
        if (typeof items === 'string') throw new Error(items);
        if (items.length > 0) await stockCountsApi.enter(id, items);
        setEdits({});
        setReasonEdits({});
        if (kind === 'save') return stockCountsApi.get(id);
        return stockCountsApi.submit(id, keys.submit);
      }
      if (kind === 'approve') return withApproval((headers) => stockCountsApi.approve(id, headers, keys.approve));
      if (kind === 'reject') return withApproval((headers) => stockCountsApi.reject(id, undefined, headers));
      return stockCountsApi.cancel(id);
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (detail, kind) => {
      setKeys({ submit: newIdempotencyKey(), approve: newIdempotencyKey() });
      await refresh(detail);
      setMessage(
        {
          save: t('Counts saved.'),
          submit:
            detail.status === 'posted'
              ? t('Submitted and posted: every difference was within the tolerance.')
              : t('Submitted. Some differences are above the tolerance and need approval.'),
          approve: t('Approved and posted.'),
          reject: t('Sent back for recounting.'),
          cancel: t('Count cancelled.'),
        }[kind]
      );
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not update the count')),
  });

  const lines = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = count?.items ?? [];
    if (!term) return items;
    return items.filter(
      (line) =>
        line.sku.toLowerCase().includes(term) ||
        (line.barcode ?? '').toLowerCase().includes(term) ||
        lineLabel(line).toLowerCase().includes(term)
    );
  }, [count, search]);

  const valueOf = (line: StockCountLine) =>
    edits[line.variantId] ?? (line.countedQuantity === null ? '' : String(line.countedQuantity));

  const busy = action.isPending;
  const showExpected = !count?.expectedHidden;
  // Once submitted, each line shows how its expected quantity was rolled forward
  const rollForward = !!count && showExpected && !editable;

  // Counted and reason cells, the same in the table and the phone cards
  const countedCell = (line: StockCountLine, className?: string) =>
    editable ? (
      <Input
        inputMode="numeric"
        value={valueOf(line)}
        placeholder="—"
        onChange={(e) => setEdits((prev) => ({ ...prev, [line.variantId]: e.target.value }))}
        aria-label={t('Counted quantity for {sku}', { sku: line.sku })}
        className={className}
      />
    ) : (
      <span>{line.countedQuantity ?? '—'}</span>
    );
  const reasonCell = (line: StockCountLine, className?: string) =>
    editable ? (
      <Input
        value={reasonEdits[line.variantId] ?? line.reason ?? ''}
        maxLength={200}
        placeholder={t('Optional')}
        onChange={(e) => setReasonEdits((prev) => ({ ...prev, [line.variantId]: e.target.value }))}
        aria-label={t('Reason for {sku}', { sku: line.sku })}
        className={className}
      />
    ) : (
      <span className="text-gray-600">{line.reason || '—'}</span>
    );
  const varianceClass = (variance: number | null) =>
    cn(
      'font-medium',
      variance !== null && Math.abs(variance) > tolerance && 'text-red-700',
      variance !== null && variance !== 0 && Math.abs(variance) <= tolerance && 'text-amber-700'
    );
  const varianceText = (variance: number | null) => (variance === null ? '—' : variance > 0 ? `+${variance}` : variance);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {count ? t('Stock count {number}', { number: count.countNumber }) : t('Stock count')}
              {count && <Badge variant={countStatusVariant[count.status]}>{t(countStatusLabels[count.status])}</Badge>}
            </DialogTitle>
            <DialogDescription>
              {count
                ? `${labelFor(count.locationId, count.location?.code)} · ${t('snapshot {date}', {
                    date: formatDateTime(count.snapshotAt ?? count.createdAt),
                  })}${count.blind ? ` · ${t('blind count')}` : ''}`
                : t('Loading...')}
            </DialogDescription>
          </DialogHeader>

          <ErrorMessage>
            {error ?? (loadError ? getErrorMessage(loadError, 'Could not load the count') : null)}
          </ErrorMessage>
          {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</div>}

          {count?.summary && (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label={t('Counted')} value={`${count.summary.counted} / ${count.summary.lines}`} />
              <Stat label={t('Lines with a difference')} value={String(count.summary.withVariance)} />
              <Stat label={t('Units over / short')} value={`+${count.summary.unitsOver} / −${count.summary.unitsShort}`} />
              <Stat label={t('Net value')} value={formatMoney(count.summary.netValue, currency)} />
            </div>
          )}
          {count?.status === 'pending_approval' && (
            <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              {plural(
                tolerance,
                'At least one difference is above the tolerance of {count} unit. Someone other than the counter with "Approve stock count variances" must approve before it is posted.',
                'At least one difference is above the tolerance of {count} units. Someone other than the counter with "Approve stock count variances" must approve before it is posted.'
              )}
            </p>
          )}
          {count?.expectedHidden && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <EyeOff className="h-4 w-4" /> {t('Blind count: expected quantities are shown after submitting.')}
            </p>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Find a product by name, SKU or barcode...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {rollForward && (
            <p className="text-xs text-gray-500">
              {t(
                'Expected at count = snapshot + movements posted while counting (sales, receipts, transfers). Sales made while you counted are not variances: only counted − expected at count is adjusted.'
              )}
            </p>
          )}

          {smallScreen ? (
            // Phones: one card per line, the counted and reason boxes full width
            <div className="max-h-[45vh] space-y-2 overflow-y-auto">
              {isLoading ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400">{t('Loading...')}</p>
              ) : (
                lines.map((line) => {
                  const variance = lineVariance(line, editable ? valueOf(line) : null);
                  const movements = line.movementsSinceSnapshot;
                  return (
                    <div key={line.id} className="space-y-2 rounded-md border p-3 text-sm">
                      <div>
                        <div className="font-medium">{lineLabel(line)}</div>
                        <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                      </div>
                      {showExpected && (
                        <dl className="grid grid-cols-3 gap-x-3 gap-y-1">
                          <div>
                            <dt className="text-xs text-gray-500">{rollForward ? t('Snapshot') : t('Expected')}</dt>
                            <dd className="text-gray-600">{line.expectedQuantity ?? '—'}</dd>
                          </div>
                          {rollForward && (
                            <>
                              <div>
                                <dt className="text-xs text-gray-500">{t('Movements while counting')}</dt>
                                <dd className="text-gray-600">
                                  {movements == null ? '—' : movements > 0 ? `+${movements}` : movements}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-gray-500">{t('Expected at count')}</dt>
                                <dd className="font-medium">{line.expectedAtCount ?? '—'}</dd>
                              </div>
                            </>
                          )}
                          <div>
                            <dt className="text-xs text-gray-500">{rollForward ? t('Variance') : t('Difference')}</dt>
                            <dd className={varianceClass(variance)}>{varianceText(variance)}</dd>
                          </div>
                        </dl>
                      )}
                      {editable ? (
                        <div className="grid grid-cols-[7rem_1fr] gap-2">
                          <label className="space-y-1">
                            <span className="text-xs text-gray-500">{t('Counted')}</span>
                            {countedCell(line, 'h-10')}
                          </label>
                          <label className="min-w-0 space-y-1">
                            <span className="text-xs text-gray-500">{t('Reason')}</span>
                            {reasonCell(line, 'h-10')}
                          </label>
                        </div>
                      ) : (
                        <dl className="grid grid-cols-3 gap-x-3">
                          <div>
                            <dt className="text-xs text-gray-500">{t('Counted')}</dt>
                            <dd>{countedCell(line)}</dd>
                          </div>
                          <div className="col-span-2 min-w-0">
                            <dt className="text-xs text-gray-500">{t('Reason')}</dt>
                            <dd className="break-words">{reasonCell(line)}</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
          <div className="max-h-[45vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('Product')}</th>
                  {showExpected && (
                    <th className="w-24 px-3 py-2 text-right font-medium">{rollForward ? t('Snapshot') : t('Expected')}</th>
                  )}
                  {rollForward && (
                    <>
                      <th className="w-28 px-3 py-2 text-right font-medium">{t('Movements while counting')}</th>
                      <th className="w-24 px-3 py-2 text-right font-medium">{t('Expected at count')}</th>
                    </>
                  )}
                  <th className="w-28 px-3 py-2 font-medium">{t('Counted')}</th>
                  {showExpected && (
                    <th className="w-24 px-3 py-2 text-right font-medium">{rollForward ? t('Variance') : t('Difference')}</th>
                  )}
                  <th className="w-48 px-3 py-2 font-medium">{t('Reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                      {t('Loading...')}
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => {
                    const variance = lineVariance(line, editable ? valueOf(line) : null);
                    const movements = line.movementsSinceSnapshot;
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{lineLabel(line)}</div>
                          <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                        </td>
                        {showExpected && (
                          <td className="px-3 py-2 text-right text-gray-600">{line.expectedQuantity ?? '—'}</td>
                        )}
                        {rollForward && (
                          <>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {movements == null ? '—' : movements > 0 ? `+${movements}` : movements}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{line.expectedAtCount ?? '—'}</td>
                          </>
                        )}
                        <td className="px-3 py-2">{countedCell(line)}</td>
                        {showExpected && (
                          <td className={cn('px-3 py-2 text-right', varianceClass(variance))}>{varianceText(variance)}</td>
                        )}
                        <td className="px-3 py-2">{reasonCell(line)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}
          {editable && (
            <p className="text-xs text-gray-500">
              {t('Leave a line empty if you did not count it: uncounted lines are not adjusted.')}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="flex gap-2">
              {(count?.status === 'in_progress' || count?.status === 'pending_approval') && (
                <Button
                  variant="outline"
                  className="text-red-600"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(t('Cancel this count? Nothing will be posted.')) && action.mutate('cancel')
                  }
                >
                  {t('Cancel count')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                {t('Close')}
              </Button>
              {editable && (
                <>
                  <Button variant="outline" disabled={busy || !dirty} onClick={() => action.mutate('save')}>
                    {t('Save counts')}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => action.mutate('submit')}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {t('Submit count')}
                  </Button>
                </>
              )}
              {count?.status === 'pending_approval' && (
                <>
                  <Button variant="outline" disabled={busy} onClick={() => action.mutate('reject')}>
                    {t('Send back')}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => action.mutate('approve')}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {t('Approve & post')}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}

/**
 * counted − expected. While counting: the entered value against the snapshot
 * (or the roll-forward when known); afterwards the server's variance.
 */
export function lineVariance(line: StockCountLine, entered: string | null): number | null {
  if (entered === null) return line.variance ?? null;
  const expected = line.expectedAtCount ?? line.expectedQuantity;
  const value = entered.trim();
  if (expected == null || !/^\d+$/.test(value)) return null;
  return Number(value) - expected;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
