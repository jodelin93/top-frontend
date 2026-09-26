'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { getErrorMessage } from '@/lib/api/client';
import { settingsApi, SettingsVersion, SettingsVersionStatus } from '@/lib/api/settings';
import { formatDateTime } from '@/lib/format';
import { t } from '@/i18n';

const STATUS_VARIANT: Record<SettingsVersionStatus, 'success' | 'warning' | 'default'> = {
  applied: 'success',
  scheduled: 'warning',
  cancelled: 'default',
};

const show = (value: unknown) =>
  value === null || value === undefined || value === ''
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

/**
 * Every settings change as a version: who changed what, when it took (or takes) effect.
 * Scheduled changes can be cancelled before they apply; any version can be viewed in full.
 */
export function SettingsHistory() {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: ['settings', 'versions'],
    queryFn: () => settingsApi.versions(),
  });
  const cancel = useMutation({
    mutationFn: settingsApi.cancelVersion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <SettingsSection
      title={t('History')}
      description={t('Every change to the store settings. Scheduled changes apply automatically at their time.')}
    >
      <div className="p-4 pb-0">
        <ErrorMessage>
          {(error && getErrorMessage(error, 'Could not load the history')) ||
            (cancel.error && getErrorMessage(cancel.error, 'Could not cancel the change'))}
        </ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Version')}</Th>
            <Th>{t('Status')}</Th>
            <Th>{t('Effective')}</Th>
            <Th>{t('Changed')}</Th>
            <Th>{t('By')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
          ) : versions.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No changes recorded yet.')}</EmptyRow>
          ) : (
            versions.map((version) => (
              <tr key={version.id}>
                <Td className="font-mono">v{version.version}</Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[version.status]}>{t(version.status)}</Badge>
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(version.effectiveFrom)}</Td>
                <Td className="max-w-sm">
                  <ChangeSummary version={version} />
                  {version.note && <div className="text-xs italic text-gray-500">{version.note}</div>}
                </Td>
                <Td>{version.actorName ?? t('System')}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(version.id)}>
                    {t('View')}
                  </Button>
                  {version.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(version.id)}
                    >
                      {t('Cancel')}
                    </Button>
                  )}
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      <VersionDialog id={viewing} onClose={() => setViewing(null)} />
    </SettingsSection>
  );
}

function ChangeSummary({ version }: { version: SettingsVersion }) {
  if (version.changedKeys.length === 0) return <span className="text-gray-500">{t('Initial settings')}</span>;
  const changes = version.changes as Record<string, unknown>;
  return (
    <ul className="space-y-0.5 text-xs">
      {version.changedKeys.map((key) => (
        <li key={key}>
          <span className="font-mono text-gray-600">{key}</span> → {show(changes[key])}
        </li>
      ))}
    </ul>
  );
}

function VersionDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'versions', id],
    queryFn: () => settingsApi.version(id!),
    enabled: !!id,
  });
  const snapshot = (data?.snapshot ?? {}) as Record<string, unknown>;
  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Settings version {version}', { version: data ? `v${data.version}` : '' })}</DialogTitle>
          <DialogDescription>
            {data
              ? `${t(data.status === 'scheduled' ? 'Takes effect {date}' : 'Took effect {date}', {
                  date: formatDateTime(data.effectiveFrom),
                })}${data.actorName ? ` · ${t('by {name}', { name: data.actorName })}` : ''}`
              : t('Loading...')}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-gray-400">{t('Loading...')}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-md border text-sm">
            {Object.keys(snapshot)
              .sort()
              .map((key) => (
                <div
                  key={key}
                  className={`flex justify-between gap-4 px-3 py-1.5 ${data?.changedKeys.includes(key) ? 'bg-amber-50' : ''}`}
                >
                  <span className="font-mono text-xs text-gray-600">{key}</span>
                  <span className="break-all text-right">{show(snapshot[key])}</span>
                </div>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
