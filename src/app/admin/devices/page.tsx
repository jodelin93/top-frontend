'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Device, devicesApi, DeviceStatus } from '@/lib/api/devices';
import { describeUserAgent } from '@/lib/api/sessions';
import { registersApi } from '@/lib/api/settings';
import { formatDateTime } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { plural, t } from '@/i18n';
import { SyncDashboard } from './sync-dashboard';

const STATUS: Record<DeviceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
  ok: { label: 'OK', variant: 'success' },
  pending: { label: 'Sales waiting', variant: 'warning' },
  failed: { label: 'Rejected sales', variant: 'danger' },
  stale: { label: 'Not seen recently', variant: 'default' },
  stale_pending: { label: 'Silent with sales waiting', variant: 'danger' },
  gap: { label: 'Missing sales', variant: 'danger' },
  revoked: { label: 'Revoked', variant: 'default' },
};

export default function DevicesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const smallScreen = useSmallScreen();
  const canManage = hasPermission(user, 'devices.manage');

  const { data: devices = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['devices'],
    queryFn: () => devicesApi.list(),
    enabled: canManage,
    refetchInterval: 60_000,
  });
  const { data: registers = [] } = useQuery({ queryKey: ['registers'], queryFn: () => registersApi.list(), enabled: canManage });
  const registerName = (id: string | null) => registers.find((r) => r.id === id)?.name ?? '—';

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['devices'] });
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => devicesApi.revoke(id, reason),
    onSuccess: refresh,
  });
  const restore = useMutation({ mutationFn: devicesApi.restore, onSuccess: refresh });
  const markLost = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => devicesApi.markLost(id, reason),
    onSuccess: refresh,
  });

  if (!canManage) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <PageHeader title={t('Devices')} />
        <ErrorMessage>{t('You need the “Manage registered devices” permission to see this page.')}</ErrorMessage>
      </div>
    );
  }

  const active = devices.filter((d) => !d.revokedAt);
  const waiting = active.reduce((sum, d) => sum + d.pendingSales, 0);
  const problems = active.filter((d) => ['gap', 'stale_pending', 'failed'].includes(d.health.status)).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Devices')}
        description={t(
          'Tills that have opened the POS: when they were last seen and synced, sales still waiting on them, and how long they may sell offline.'
        )}
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t('Active devices')} value={active.length} />
        <Stat label={t('Offline sales waiting')} value={waiting} tone={waiting > 0 ? 'warning' : undefined} />
        <Stat label={t('Devices needing attention')} value={problems} tone={problems > 0 ? 'danger' : undefined} />
      </div>

      <SyncDashboard devices={devices} />

      <Card className="bg-white">
        <ErrorMessage>
          {(error && getErrorMessage(error, 'Could not load devices')) ||
            ((revoke.error || restore.error || markLost.error) &&
              getErrorMessage(revoke.error ?? restore.error ?? markLost.error, 'Could not update the device'))}
        </ErrorMessage>
        {smallScreen ? (
          // Phones: one card per device (tap to show its details) instead of a table that scrolls sideways
          <DataCards
            items={devices}
            getKey={(device) => device.id}
            onItemClick={(device) => setExpanded(expanded === device.id ? null : device.id)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No devices yet. A till registers itself the first time it opens the POS.')}
          >
            {(device) => (
              <>
                <DataCardHeader
                  className={device.revokedAt ? 'opacity-60' : undefined}
                  title={
                    <span className="inline-flex items-center gap-1">
                      {expanded === device.id ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      {device.name}
                    </span>
                  }
                  subtitle={`${registerName(device.registerId)} · ${describeUserAgent(device.userAgent)}`}
                  onTitleClick={() => setExpanded(expanded === device.id ? null : device.id)}
                  badge={<Badge variant={STATUS[device.health.status].variant}>{t(STATUS[device.health.status].label)}</Badge>}
                />
                <DataCardFields className={device.revokedAt ? 'opacity-60' : undefined}>
                  <DataCardField label={t('Last seen')}>{formatDateTime(device.lastSeenAt)}</DataCardField>
                  <DataCardField label={t('Last sync')}>{formatDateTime(device.lastSyncAt)}</DataCardField>
                  <DataCardField label={t('Waiting')}>
                    {device.pendingSales}
                    {device.failedSales > 0 && <span className="block text-xs text-red-600">{t('{count} rejected', { count: device.failedSales })}</span>}
                  </DataCardField>
                  <DataCardField label={t('Offline until')}>
                    {device.revokedAt ? '—' : device.health.leaseActive ? formatDateTime(device.leaseExpiresAt) : t('Expired')}
                  </DataCardField>
                </DataCardFields>
                {expanded === device.id && (
                  <div className="rounded-md bg-gray-50 p-3">
                    <DeviceDetails device={device} />
                  </div>
                )}
                <DataCardActions>
                  {device.lostAt ? (
                    <span className="text-xs font-medium text-red-700">{t('Lost')}</span>
                  ) : device.revokedAt ? (
                    <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(device.id)}>
                      {t('Restore')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={revoke.isPending}
                      onClick={() => {
                        const reason = window.prompt(
                          t('Revoke "{name}"? It will stop selling offline at once. Reason (optional):', {
                            name: device.name,
                          })
                        );
                        if (reason !== null) revoke.mutate({ id: device.id, reason: reason || undefined });
                      }}
                    >
                      {t('Revoke')}
                    </Button>
                  )}
                  {!device.lostAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700"
                      disabled={markLost.isPending}
                      title={t('Lost or abandoned: revoke for good, refuse its sync and open a review case')}
                      onClick={() => {
                        const reason = window.prompt(
                          t(
                            'Mark "{name}" as lost? It is revoked for good, its {count} unsynced sales are recorded and a review case is opened. Reason (optional):',
                            { name: device.name, count: device.pendingSales + device.health.unaccountedCount }
                          )
                        );
                        if (reason !== null) markLost.mutate({ id: device.id, reason: reason || undefined });
                      }}
                    >
                      {t('Mark lost')}
                    </Button>
                  )}
                </DataCardActions>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-8" />
              <Th>{t('Device')}</Th>
              <Th>{t('Status')}</Th>
              <Th>{t('Last seen')}</Th>
              <Th>{t('Last sync')}</Th>
              <Th className="text-right">{t('Waiting')}</Th>
              <Th>{t('Offline until')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
            ) : devices.length === 0 ? (
              <EmptyRow colSpan={8}>{t('No devices yet. A till registers itself the first time it opens the POS.')}</EmptyRow>
            ) : (
              devices.map((device) => (
                <Fragment key={device.id}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50 ${device.revokedAt ? 'text-gray-400' : ''}`}
                    onClick={() => setExpanded(expanded === device.id ? null : device.id)}
                  >
                    <Td>{expanded === device.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Td>
                    <Td>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-gray-500">
                        {registerName(device.registerId)} · {describeUserAgent(device.userAgent)}
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={STATUS[device.health.status].variant}>{t(STATUS[device.health.status].label)}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(device.lastSeenAt)}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(device.lastSyncAt)}</Td>
                    <Td className="text-right">
                      {device.pendingSales}
                      {device.failedSales > 0 && <span className="block text-xs text-red-600">{t('{count} rejected', { count: device.failedSales })}</span>}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {device.revokedAt ? '—' : device.health.leaseActive ? formatDateTime(device.leaseExpiresAt) : t('Expired')}
                    </Td>
                    <Td className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {device.lostAt ? (
                        <span className="text-xs font-medium text-red-700">{t('Lost')}</span>
                      ) : device.revokedAt ? (
                        <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(device.id)}>
                          {t('Restore')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={revoke.isPending}
                          onClick={() => {
                            const reason = window.prompt(
                              t('Revoke "{name}"? It will stop selling offline at once. Reason (optional):', {
                                name: device.name,
                              })
                            );
                            if (reason !== null) revoke.mutate({ id: device.id, reason: reason || undefined });
                          }}
                        >
                          {t('Revoke')}
                        </Button>
                      )}
                      {!device.lostAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-1 text-red-700"
                          disabled={markLost.isPending}
                          title={t('Lost or abandoned: revoke for good, refuse its sync and open a review case')}
                          onClick={() => {
                            const reason = window.prompt(
                              t(
                                'Mark "{name}" as lost? It is revoked for good, its {count} unsynced sales are recorded and a review case is opened. Reason (optional):',
                                { name: device.name, count: device.pendingSales + device.health.unaccountedCount }
                              )
                            );
                            if (reason !== null) markLost.mutate({ id: device.id, reason: reason || undefined });
                          }}
                        >
                          {t('Mark lost')}
                        </Button>
                      )}
                    </Td>
                  </tr>
                  {expanded === device.id && (
                    <tr>
                      <td colSpan={8} className="bg-gray-50 px-4 py-3">
                        <DeviceDetails device={device} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </TBody>
        </Table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'danger' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-gray-900';
  return (
    <Card className="bg-white p-4">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </Card>
  );
}

function DeviceDetails({ device }: { device: Device }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(device.name);
  const { data: detail } = useQuery({ queryKey: ['devices', device.id], queryFn: () => devicesApi.get(device.id) });
  const rename = useMutation({
    mutationFn: () => devicesApi.update(device.id, { name: name.trim() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });
  const missing = detail?.missingSequences ?? [];

  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-gray-500">{t('Registered')}</dt>
        <dd>{formatDateTime(device.registeredAt)}</dd>
        <dt className="text-gray-500">{t('Offline sales received')}</dt>
        <dd>{device.receivedCount}</dd>
        <dt className="text-gray-500">{t('Highest sale number on device')}</dt>
        <dd>{device.health.expectedSequence}</dd>
        <dt className="text-gray-500">{t('Last sale received')}</dt>
        <dd>{formatDateTime(device.lastSaleAt)}</dd>
        {device.lostAt && (
          <>
            <dt className="text-gray-500">{t('Marked lost')}</dt>
            <dd className="text-red-700">
              {formatDateTime(device.lostAt)} ·{' '}
              {plural(device.lostUnsyncedCount ?? 0, '{count} unsynced sale', '{count} unsynced sales')}
            </dd>
          </>
        )}
        {device.revokedAt && (
          <>
            <dt className="text-gray-500">{t('Revoked')}</dt>
            <dd>
              {formatDateTime(device.revokedAt)}
              {device.revokedReason && ` — ${device.revokedReason}`}
            </dd>
          </>
        )}
      </dl>
      <div className="space-y-3">
        {device.health.missingCount > 0 ? (
          <div className={device.health.unaccountedCount > 0 ? 'text-red-700' : 'text-amber-800'}>
            <p className="font-medium">
              {plural(
                device.health.missingCount,
                '{count} offline sale not received yet',
                '{count} offline sales not received yet'
              )}
              {device.health.unaccountedCount > 0 &&
                ` — ${t('{count} not reported as waiting on the till (possibly lost)', {
                  count: device.health.unaccountedCount,
                })}`}
            </p>
            {missing.length > 0 && (
              <p className="text-xs">
                {t('Missing sale numbers on this device: {numbers}', {
                  numbers: `${missing.slice(0, 50).join(', ')}${missing.length > 50 ? '…' : ''}`,
                })}
              </p>
            )}
            <p className="text-xs text-gray-600">
              {t(
                'Open the POS on that till while online so it uploads its queue; check its “Offline sales” list for rejected sales.'
              )}
            </p>
          </div>
        ) : (
          <p className="text-gray-600">{t('Every offline sale from this till has been received.')}</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) rename.mutate();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('Device name')} className="h-8" maxLength={100} />
          <Button size="sm" type="submit" variant="outline" disabled={rename.isPending || name.trim() === device.name}>
            {t('Rename')}
          </Button>
        </form>
      </div>
    </div>
  );
}
