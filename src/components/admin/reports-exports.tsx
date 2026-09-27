'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Download, Loader2, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/client';
import { ExportFormat, ExportJob, exportsApi, ReportParams } from '@/lib/api/reports';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { translateServerError } from '@/lib/server-texts';

const FORMAT_LABELS: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel', pdf: 'PDF' };

const active = (job: ExportJob) => job.status === 'queued' || job.status === 'running';

/** The user's background exports; polled while any is still being built */
export function useExportJobs(enabled = true) {
  return useQuery({
    queryKey: ['exports'],
    queryFn: exportsApi.list,
    enabled,
    refetchInterval: (query) => (query.state.data?.some(active) ? 3000 : false),
  });
}

/**
 * "Export in background": the file is built on the server (large reports never
 * block the page) and listed in the export jobs panel when ready.
 */
export function BackgroundExportButton({
  reportKey,
  params,
  disabled,
}: {
  reportKey: string;
  params: ReportParams;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => exportsApi.create({ reportKey, format, params }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not start the export')),
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="h-8 w-24 text-xs"
          aria-label={t('File format')}
        >
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </Select>
        <Button variant="outline" size="sm" disabled={disabled || create.isPending} onClick={() => create.mutate()}>
          <Clock className="h-4 w-4" />
          {create.isPending ? t('Starting...') : t('Export in background')}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Background exports of the last 7 days with their status. Downloading asks the
 * server for a link valid a few minutes (it checks the permission again).
 */
export function ExportJobsPanel({ reportTitle }: { reportTitle: (key: string) => string }) {
  const queryClient = useQueryClient();
  const { data: jobs = [] } = useExportJobs();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (jobs.length === 0) return null;

  const download = async (job: ExportJob) => {
    setBusy(job.id);
    setError(null);
    try {
      const fresh = await exportsApi.get(job.id);
      if (!fresh.downloadUrl) {
        setError(t('This export is no longer available.'));
        void queryClient.invalidateQueries({ queryKey: ['exports'] });
        return;
      }
      const link = document.createElement('a');
      link.href = fresh.downloadUrl;
      link.rel = 'noopener';
      link.click();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not download the export'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (job: ExportJob) => {
    setBusy(job.id);
    try {
      await exportsApi.remove(job.id);
      void queryClient.invalidateQueries({ queryKey: ['exports'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the export'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border-t bg-gray-50/60 p-4">
      <h3 className="mb-2 text-sm font-semibold">{t('Background exports')}</h3>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <ul className="divide-y rounded-md border bg-white text-sm">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <StatusIcon job={job} />
            <div className="min-w-0 flex-1 max-md:basis-40">
              <div className="truncate font-medium">
                {reportTitle(job.reportKey)} · {FORMAT_LABELS[job.format]}
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(job.createdAt)}
                {job.status === 'done' && job.rowCount !== null && ` · ${t('{count} row(s)', { count: job.rowCount })}`}
                {job.status === 'done' &&
                  job.expiresAt &&
                  ` · ${t('Available until {time}', { time: formatDateTime(job.expiresAt) })}`}
                {job.status === 'failed' && job.error && ` · ${translateServerError(job.error)}`}
              </div>
            </div>
            <span className={cn('text-xs', job.status === 'failed' ? 'text-red-600' : 'text-gray-500')}>
              {t(STATUS_LABELS[job.status])}
            </span>
            {job.status === 'done' && (
              <Button size="sm" variant="outline" disabled={busy === job.id} onClick={() => void download(job)}>
                <Download className="h-4 w-4" />
                {t('Download')}
              </Button>
            )}
            {!active(job) && (
              <Button
                size="icon"
                variant="ghost"
                disabled={busy === job.id}
                onClick={() => void remove(job)}
                aria-label={t('Delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_LABELS: Record<ExportJob['status'], string> = {
  queued: 'Waiting',
  running: 'Building the file...',
  done: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
};

function StatusIcon({ job }: { job: ExportJob }) {
  if (active(job)) return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />;
  if (job.status === 'done') return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
  if (job.status === 'failed') return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
  return <Clock className="h-4 w-4 shrink-0 text-gray-400" />;
}
