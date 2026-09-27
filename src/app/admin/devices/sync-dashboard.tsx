'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import type { Device } from '@/lib/api/devices';
import type { SyncAck } from '@/lib/api/sync';
import { importExport, parseExport, type UnsyncedExport } from '@/lib/pos/sync';
import { useCurrency } from '@/hooks/use-store-settings';
import { formatDateTime, formatMoney } from '@/lib/format';
import { plural, t } from '@/i18n';

export type SyncFilter = 'all' | 'pending' | 'review' | 'conflicts' | 'lease';

const needsReviewOf = (d: Device) => Math.max(d.failedSales, d.needsReviewOps ?? 0);
const leaseExpired = (d: Device, now: number) =>
  !d.revokedAt && (!d.leaseExpiresAt || Date.parse(d.leaseExpiresAt) <= now);

/** Devices matching a dashboard filter and search (unit tested in sync-dashboard.test.ts). */
export function filterDevices(devices: Device[], filter: SyncFilter, search: string, now = Date.now()): Device[] {
  const q = search.trim().toLowerCase();
  return devices.filter(
    (d) =>
      (!q || d.name.toLowerCase().includes(q)) &&
      (filter === 'all' ||
        (filter === 'pending' && d.pendingSales > 0) ||
        (filter === 'review' && needsReviewOf(d) > 0) ||
        (filter === 'conflicts' && (d.openConflicts ?? 0) > 0) ||
        (filter === 'lease' && leaseExpired(d, now)))
  );
}

/** "3 h 5 min" since a time (queue age). */
export function ageOf(since: string | null | undefined, now = Date.now()): string {
  if (!since) return '—';
  const minutes = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  if (minutes < 60) return t('{count} min', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return t('{hours} h {minutes} min', { hours, minutes: minutes % 60 });
  return t('{count} days', { count: Math.floor(hours / 24) });
}

/**
 * Sync dashboard (spec §19): per till, the age of its oldest unsynced sale, queue
 * size, upload retries, sales waiting for review, open review cases, the money at
 * stake, last sync and when its offline lease ends. Also imports the export file
 * of a dead till.
 */
export function SyncDashboard({ devices }: { devices: Device[] }) {
  const currency = useCurrency();
  const [filter, setFilter] = useState<SyncFilter>('all');
  const [search, setSearch] = useState('');
  const smallScreen = useSmallScreen();
  const [now] = useState(() => Date.now());
  const shown = useMemo(() => filterDevices(devices, filter, search, now), [devices, filter, search, now]);
  const active = devices.filter((d) => !d.revokedAt);
  const atStake = active.reduce((sum, d) => sum + Number(d.pendingAmount ?? 0), 0);
  const oldest = active.reduce<string | null>(
    (min, d) => (d.oldestPendingAt && (!min || d.oldestPendingAt < min) ? d.oldestPendingAt : min),
    null
  );

  return (
    <Card className="space-y-3 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{t('Sync status')}</h2>
          <p className="text-sm text-gray-500">
            {t('Money not yet uploaded: {amount}. Oldest unsynced sale: {age}.', {
              amount: formatMoney(atStake, currency),
              age: oldest ? ageOf(oldest, now) : '—',
            })}
          </p>
        </div>
        <ImportUnsynced devices={devices} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as SyncFilter)}
          className="sm:w-60"
          aria-label={t('Filter devices')}
        >
          <option value="all">{t('All devices')}</option>
          <option value="pending">{t('With unsynced sales')}</option>
          <option value="review">{t('With sales needing review')}</option>
          <option value="conflicts">{t('With open review cases')}</option>
          <option value="lease">{t('Offline lease expired')}</option>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search devices')}
          aria-label={t('Search devices')}
          className="sm:w-60"
        />
      </div>

      {smallScreen ? (
        // Phones: one card per device instead of a table that scrolls sideways
        <DataCards
          items={shown}
          getKey={(d) => d.id}
          emptyText={t('No devices match.')}
          className="p-0"
          itemClassName={(d) => (d.revokedAt ? 'opacity-60' : undefined)}
        >
          {(d) => (
            <>
              <DataCardHeader
                title={d.name}
                badge={needsReviewOf(d) > 0 ? <Badge variant="danger">{t('Needs review')}: {needsReviewOf(d)}</Badge> : undefined}
              />
              <DataCardFields>
                <DataCardField label={t('Unsynced')}>{d.pendingSales}</DataCardField>
                <DataCardField label={t('Last sync')}>{formatDateTime(d.lastSyncAt)}</DataCardField>
                {/* Queue details only when something is waiting, so idle tills stay short */}
                {d.pendingSales > 0 && (
                  <>
                    <DataCardField label={t('Queue age')}>{ageOf(d.oldestPendingAt, now)}</DataCardField>
                    <DataCardField label={t('At stake')}>{formatMoney(d.pendingAmount ?? 0, currency)}</DataCardField>
                  </>
                )}
                {(d.syncRetries ?? 0) > 0 && <DataCardField label={t('Retries')}>{d.syncRetries}</DataCardField>}
                {(d.openConflicts ?? 0) > 0 && (
                  <DataCardField label={t('Review cases')}>
                    <Link className="text-blue-600 underline" href={`/admin/review?deviceId=${d.id}`}>
                      {d.openConflicts}
                    </Link>
                  </DataCardField>
                )}
                <DataCardField label={t('Lease ends')}>
                  {d.revokedAt ? '—' : leaseExpired(d, now) ? t('Expired') : formatDateTime(d.leaseExpiresAt)}
                </DataCardField>
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Device')}</Th>
            <Th>{t('Queue age')}</Th>
            <Th className="text-right">{t('Unsynced')}</Th>
            <Th className="text-right">{t('Retries')}</Th>
            <Th className="text-right">{t('Needs review')}</Th>
            <Th className="text-right">{t('Review cases')}</Th>
            <Th className="text-right">{t('At stake')}</Th>
            <Th>{t('Last sync')}</Th>
            <Th>{t('Lease ends')}</Th>
          </tr>
        </THead>
        <TBody>
          {shown.length === 0 ? (
            <EmptyRow colSpan={9}>{t('No devices match.')}</EmptyRow>
          ) : (
            shown.map((d) => (
              <tr key={d.id} className={d.revokedAt ? 'text-gray-400' : undefined}>
                <Td className="font-medium">{d.name}</Td>
                <Td className="whitespace-nowrap">{d.pendingSales > 0 ? ageOf(d.oldestPendingAt, now) : '—'}</Td>
                <Td className="text-right">{d.pendingSales}</Td>
                <Td className="text-right">{d.syncRetries ?? 0}</Td>
                <Td className="text-right">
                  {needsReviewOf(d) > 0 ? <Badge variant="danger">{needsReviewOf(d)}</Badge> : 0}
                </Td>
                <Td className="text-right">
                  {(d.openConflicts ?? 0) > 0 ? (
                    <Link className="text-blue-600 underline" href={`/admin/review?deviceId=${d.id}`}>
                      {d.openConflicts}
                    </Link>
                  ) : (
                    0
                  )}
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {d.pendingSales > 0 ? formatMoney(d.pendingAmount ?? 0, currency) : '—'}
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(d.lastSyncAt)}</Td>
                <Td className="whitespace-nowrap">
                  {d.revokedAt ? '—' : leaseExpired(d, now) ? t('Expired') : formatDateTime(d.leaseExpiresAt)}
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}
    </Card>
  );
}

/** Upload the "Export unsynced sales" file of a till that can no longer sync. */
function ImportUnsynced({ devices }: { devices: Device[] }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<UnsyncedExport | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SyncAck[] | null>(null);

  const choose = async (picked: File | undefined) => {
    setError(null);
    setResults(null);
    if (!picked) return;
    try {
      const parsed = parseExport(await picked.text());
      setFile(parsed);
      setDeviceId(parsed.device?.id && devices.some((d) => d.id === parsed.device!.id) ? parsed.device.id : '');
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const upload = async () => {
    if (!file || !deviceId) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await importExport(file, deviceId));
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
    } catch (e) {
      setError(getErrorMessage(e, 'The sales could not be imported'));
    } finally {
      setBusy(false);
    }
  };

  const count = (status: SyncAck['status']) => results?.filter((r) => r.status === status).length ?? 0;

  return (
    <div className="space-y-2 text-sm sm:max-w-md">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button variant="outline" onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" />
        {t('Import unsynced sales')}
      </Button>
      {file && (
        <div className="space-y-2 rounded-md border p-2">
          <p>
            {plural(file.operations.length, '{count} sale in the file', '{count} sales in the file')} ·{' '}
            {t('exported {date}', { date: formatDateTime(file.exportedAt) })}
          </p>
          <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} aria-label={t('Till the sales come from')}>
            <option value="">{t('Till the sales come from')}</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Button onClick={upload} disabled={busy || !deviceId}>
            {busy ? t('Importing...') : t('Import')}
          </Button>
        </div>
      )}
      {results && (
        <p>
          {t('{accepted} recorded, {already} already received, {review} need review, {waiting} to retry.', {
            accepted: count('accepted'),
            already: count('already_applied'),
            review: count('needs_review'),
            waiting: count('pending_dependency'),
          })}
        </p>
      )}
      {results?.some((r) => r.status === 'needs_review') && (
        <ul className="list-inside list-disc text-xs text-red-600">
          {results
            .filter((r) => r.status === 'needs_review')
            .slice(0, 20)
            .map((r) => (
              <li key={r.deviceOperationId}>
                #{r.deviceSequence}: {r.reason}
              </li>
            ))}
        </ul>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
