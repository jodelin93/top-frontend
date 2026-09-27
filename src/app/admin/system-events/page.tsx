'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { CheckRun, OutboxEventRow, OutboxStatus, systemEventsApi } from '@/lib/api/system-events';
import { formatDateTime } from '@/lib/format';
import { plural, t } from '@/i18n';

const STATUS_FILTERS: { value: OutboxStatus | 'all'; label: string }[] = [
  { value: 'failed', label: 'Failed (retrying)' },
  { value: 'dead', label: 'Dead-lettered' },
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Delivered' },
  { value: 'all', label: 'All events' },
];

function statusLabel(status: OutboxStatus) {
  switch (status) {
    case 'failed':
      return t('Failed');
    case 'dead':
      return t('Dead-lettered');
    case 'pending':
      return t('Pending');
    default:
      return t('Delivered');
  }
}

const statusBadge = (status: OutboxStatus) =>
  status === 'dead' ? 'danger' : status === 'failed' ? 'warning' : status === 'published' ? 'success' : 'default';

function runStatusLabel(status: CheckRun['status']) {
  switch (status) {
    case 'passed':
      return t('Passed');
    case 'issues':
      return t('Issues found');
    case 'failed':
      return t('Failed');
    default:
      return t('Running');
  }
}

/** Lag in seconds / minutes / hours */
function formatLag(ms: number) {
  if (ms < 60_000) return t('{count} s', { count: Math.round(ms / 1000) });
  if (ms < 3_600_000) return t('{count} min', { count: Math.round(ms / 60_000) });
  return t('{count} h', { count: Math.round(ms / 3_600_000) });
}

export default function SystemEventsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const summary = useQuery({
    queryKey: ['system-events', 'summary'],
    queryFn: systemEventsApi.summary,
    refetchInterval: 30_000,
  });
  const runChecks = useMutation({
    mutationFn: systemEventsApi.runChecks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-events'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not run the checks')),
  });
  const outbox = summary.data?.outbox;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('System events')}
        description={t('Background event delivery, failures and the daily reconciliation checks.')}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['system-events'] })}
            >
              <RefreshCw className="h-4 w-4" />
              {t('Refresh')}
            </Button>
            <Button onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
              <Play className="h-4 w-4" />
              {runChecks.isPending ? t('Running checks...') : t('Run checks now')}
            </Button>
          </>
        }
      />
      <ErrorMessage>{error ?? (summary.error && getErrorMessage(summary.error, 'Could not load system events'))}</ErrorMessage>

      {outbox && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label={t('Delivery lag')} value={formatLag(outbox.lagMs)} tone={outbox.stalled ? 'danger' : 'default'} />
          <Stat label={t('Pending')} value={outbox.pending} />
          <Stat label={t('Failed (retrying)')} value={outbox.failed} tone={outbox.failed ? 'warning' : 'default'} />
          <Stat label={t('Dead-lettered')} value={outbox.deadLettered} tone={outbox.deadLettered ? 'danger' : 'default'} />
          <Stat label={t('Delivered in the last 24 h')} value={outbox.publishedLastDay} />
        </div>
      )}
      {outbox?.stalled && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t('Events have been waiting for more than 5 minutes. Check that the API is running and look at the failed events below.')}
        </div>
      )}

      <OutboxEvents onError={setError} />
      <CheckRuns />
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'warning' | 'danger' }) {
  return (
    <Card className="bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div
        className={
          tone === 'danger'
            ? 'text-2xl font-semibold text-red-600'
            : tone === 'warning'
              ? 'text-2xl font-semibold text-amber-600'
              : 'text-2xl font-semibold'
        }
      >
        {value}
      </div>
    </Card>
  );
}

function OutboxEvents({ onError }: { onError: (message: string | null) => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OutboxStatus | 'all'>('failed');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const smallScreen = useSmallScreen();
  const { data, isLoading } = useQuery({
    queryKey: ['system-events', 'outbox', status, page],
    queryFn: () => systemEventsApi.outbox({ status, page, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const done = () => {
    onError(null);
    return queryClient.invalidateQueries({ queryKey: ['system-events'] });
  };
  const retry = useMutation({
    mutationFn: systemEventsApi.retry,
    onSuccess: done,
    onError: (err) => onError(getErrorMessage(err, 'Could not retry the event')),
  });
  const replay = useMutation({
    mutationFn: (id: string) => systemEventsApi.replay(id),
    onSuccess: done,
    onError: (err) => onError(getErrorMessage(err, 'Could not replay the event')),
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const confirmReplay = (row: OutboxEventRow) => {
    if (window.confirm(t('Run every consumer of this event again, including those that already handled it?'))) {
      replay.mutate(row.id);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t('Outbox events')}</CardTitle>
          <CardDescription>
            {t('Changes are announced as events and delivered in the background. Failed deliveries are retried with a growing delay, then set aside (dead-lettered).')}
          </CardDescription>
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OutboxStatus | 'all');
            setPage(1);
          }}
          className="shrink-0 sm:w-48"
          aria-label={t('Status')}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {t(f.label)}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {smallScreen ? (
          // Phones: one card per event instead of a table that scrolls sideways
          <DataCards
            items={rows}
            getKey={(row) => row.id}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No events match.')}
          >
            {(row) => (
              <>
                <DataCardHeader
                  title={<span className="break-all font-mono text-xs">{row.eventType}</span>}
                  subtitle={formatDateTime(row.occurredAt)}
                  badge={<Badge variant={statusBadge(row.status)}>{statusLabel(row.status)}</Badge>}
                />
                <DataCardFields>
                  <DataCardField label={t('Attempts')}>{row.attempts}</DataCardField>
                  <DataCardField label={t('Event')} full>
                    <span className="break-all font-mono text-xs text-gray-500">
                      {row.aggregateType} {row.aggregateId}
                    </span>
                  </DataCardField>
                  {row.lastError && (
                    <DataCardField label={t('Last error')} full>
                      <span className="line-clamp-2 text-xs text-gray-600">{row.lastError}</span>
                    </DataCardField>
                  )}
                </DataCardFields>
                {expanded === row.id && (
                  <div className="rounded-md bg-gray-50 p-3">
                    <EventDetails row={row} />
                  </div>
                )}
                <DataCardActions>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mr-auto"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    aria-label={t('Details')}
                  >
                    {expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {t('Details')}
                  </Button>
                  {row.status !== 'published' && (
                    <Button size="sm" variant="outline" onClick={() => retry.mutate(row.id)} disabled={retry.isPending}>
                      <RotateCcw className="h-3 w-3" />
                      {t('Retry')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => confirmReplay(row)} disabled={replay.isPending}>
                    {t('Replay')}
                  </Button>
                </DataCardActions>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-8" />
              <Th>{t('When')}</Th>
              <Th>{t('Event')}</Th>
              <Th>{t('Status')}</Th>
              <Th>{t('Attempts')}</Th>
              <Th>{t('Last error')}</Th>
              <Th className="text-right">{t('Actions')}</Th>
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
                  <tr className="hover:bg-gray-50">
                    <Td>
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                        aria-label={t('Details')}
                      >
                        {expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(row.occurredAt)}</Td>
                    <Td>
                      <div className="font-mono text-xs">{row.eventType}</div>
                      <div className="font-mono text-xs text-gray-500">
                        {row.aggregateType} {row.aggregateId}
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={statusBadge(row.status)}>{statusLabel(row.status)}</Badge>
                    </Td>
                    <Td>{row.attempts}</Td>
                    <Td className="max-w-xs truncate text-xs text-gray-600" title={row.lastError ?? undefined}>
                      {row.lastError ?? '—'}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      {row.status !== 'published' && (
                        <Button size="sm" variant="outline" onClick={() => retry.mutate(row.id)} disabled={retry.isPending}>
                          <RotateCcw className="h-3 w-3" />
                          {t('Retry')}
                        </Button>
                      )}{' '}
                      <Button size="sm" variant="ghost" onClick={() => confirmReplay(row)} disabled={replay.isPending}>
                        {t('Replay')}
                      </Button>
                    </Td>
                  </tr>
                  {expanded === row.id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-4 py-3">
                        <EventDetails row={row} />
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
            <span>{t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventDetails({ row }: { row: OutboxEventRow }) {
  const { data } = useQuery({ queryKey: ['system-events', 'event', row.id], queryFn: () => systemEventsApi.event(row.id) });
  return (
    <div className="grid gap-3 text-xs md:grid-cols-2">
      <div className="min-w-0 space-y-1">
        <div className="font-semibold text-gray-700">{t('Payload')}</div>
        <pre className="max-h-64 overflow-auto rounded bg-white p-2">{JSON.stringify(row.payload, null, 2)}</pre>
      </div>
      <div className="min-w-0 space-y-2">
        <div>
          <span className="font-semibold text-gray-700">{t('Request id')}: </span>
          <span className="break-all font-mono">{row.correlationId ?? '—'}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">{t('Next attempt')}: </span>
          {row.publishedAt || row.deadLetteredAt ? '—' : formatDateTime(row.nextAttemptAt)}
        </div>
        <div>
          <div className="font-semibold text-gray-700">{t('Handled by')}</div>
          {data?.consumers?.length ? (
            <ul className="list-inside list-disc">
              {data.consumers.map((c) => (
                <li key={c.consumer}>
                  <span className="font-mono">{c.consumer}</span> · {formatDateTime(c.processedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-500">{t('No consumer has handled it yet.')}</span>
          )}
        </div>
        {row.lastError && <pre className="whitespace-pre-wrap rounded bg-white p-2 text-red-700">{row.lastError}</pre>}
      </div>
    </div>
  );
}

function CheckRuns() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const smallScreen = useSmallScreen();
  const { data: runs, isLoading } = useQuery({
    queryKey: ['system-events', 'checks'],
    queryFn: () => systemEventsApi.checkRuns(20),
  });

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{t('Reconciliation checks')}</CardTitle>
        <CardDescription>
          {t('Run every day: sales, payments and returns add up, captured payments belong to completed sales, stock matches its ledger and events are delivered.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {smallScreen ? (
          // Phones: one card per run (tap for the results) instead of a table that scrolls sideways
          <DataCards
            items={runs ?? []}
            getKey={(run) => run.id}
            onItemClick={(run) => setExpanded(expanded === run.id ? null : run.id)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No checks have run yet.')}
          >
            {(run) => {
              const failing = run.results.filter((r) => !r.passed);
              return (
                <>
                  <DataCardHeader
                    title={
                      <span className="inline-flex items-center gap-1">
                        {expanded === run.id ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        {formatDateTime(run.startedAt)}
                      </span>
                    }
                    subtitle={run.trigger === 'manual' ? t('Manual') : t('Scheduled')}
                    onTitleClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    badge={
                      <Badge variant={run.status === 'passed' ? 'success' : run.status === 'running' ? 'default' : 'danger'}>
                        {runStatusLabel(run.status)}
                      </Badge>
                    }
                  />
                  {(run.status === 'failed' || failing.length > 0) && (
                    <DataCardFields>
                      <DataCardField label={t('Checks with issues')} full>
                        {run.status === 'failed' ? run.error : failing.map((r) => t(r.label)).join(', ')}
                      </DataCardField>
                    </DataCardFields>
                  )}
                  {expanded === run.id && (
                    <div className="rounded-md bg-gray-50 p-3">
                      <RunResults run={run} />
                    </div>
                  )}
                </>
              );
            }}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-8" />
              <Th>{t('Started')}</Th>
              <Th>{t('Trigger')}</Th>
              <Th>{t('Status')}</Th>
              <Th>{t('Checks with issues')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={5}>{t('Loading...')}</EmptyRow>
            ) : !runs?.length ? (
              <EmptyRow colSpan={5}>{t('No checks have run yet.')}</EmptyRow>
            ) : (
              runs.map((run) => {
                const failing = run.results.filter((r) => !r.passed);
                return (
                  <Fragment key={run.id}>
                    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                      <Td>{expanded === run.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Td>
                      <Td className="whitespace-nowrap">{formatDateTime(run.startedAt)}</Td>
                      <Td>{run.trigger === 'manual' ? t('Manual') : t('Scheduled')}</Td>
                      <Td>
                        <Badge
                          variant={run.status === 'passed' ? 'success' : run.status === 'running' ? 'default' : 'danger'}
                        >
                          {runStatusLabel(run.status)}
                        </Badge>
                      </Td>
                      <Td>
                        {run.status === 'failed'
                          ? run.error
                          : failing.length
                            ? failing.map((r) => t(r.label)).join(', ')
                            : '—'}
                      </Td>
                    </tr>
                    {expanded === run.id && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-4 py-3">
                          <RunResults run={run} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </TBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Result of each check in one run, with the issues found */
function RunResults({ run }: { run: CheckRun }) {
  return (
    <ul className="space-y-2 text-sm">
      {run.results.map((result) => (
        <li key={result.key}>
          <div className="flex items-center gap-2">
            <Badge variant={result.passed ? 'success' : 'danger'}>
              {result.passed ? t('OK') : plural(result.issueCount, '{count} issue', '{count} issues')}
            </Badge>
            <span>{t(result.label)}</span>
          </div>
          {!result.passed && (
            <ul className="ml-6 mt-1 list-disc text-xs text-gray-600">
              {result.issues.map((issue, index) => (
                <li key={index}>
                  <span className="font-mono">{issue.reference}</span>
                  {issue.expected !== undefined && issue.expected !== null && (
                    <> · {t('expected {expected}, found {actual}', { expected: issue.expected, actual: issue.actual ?? '—' })}</>
                  )}
                  {issue.detail && <> · {issue.detail}</>}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
