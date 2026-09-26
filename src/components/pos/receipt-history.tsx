'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { documentsApi, type DocumentDelivery, type PrintJob } from '@/lib/hardware/documents-api';
import { formatDateTime } from '@/lib/format';
import { t } from '@/i18n';

const JOB_STATUS: Record<PrintJob['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
  queued: { label: 'Queued', variant: 'default' },
  sent: { label: 'Sent to printer', variant: 'info' },
  printed: { label: 'Printed', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  unknown: { label: 'Not confirmed', variant: 'warning' },
};

const DELIVERY_STATUS: Record<DocumentDelivery['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
  queued: { label: 'Queued', variant: 'default' },
  sent: { label: 'Sent', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  revoked: { label: 'Withdrawn', variant: 'default' },
};

/**
 * Print history of a sale (spec §15): the original, every copy with its number,
 * who printed it, how (print bridge or print dialog) and the outcome; then the
 * e-mails and shared links sent for it.
 */
export function PrintHistory({ saleId, refreshKey }: { saleId: string; refreshKey?: string | null }) {
  const { data: jobs = [] } = useQuery({
    queryKey: ['print-history', saleId, refreshKey],
    queryFn: () => documentsApi.printJobs('receipt', saleId),
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['print-history', saleId, 'deliveries', refreshKey],
    queryFn: () => documentsApi.deliveries(saleId),
  });
  if (!jobs.length && !deliveries.length) return null;

  return (
    <details className="rounded-md border p-2 text-sm">
      <summary className="cursor-pointer font-medium">{t('Print history ({count})', { count: jobs.length + deliveries.length })}</summary>
      <ul className="mt-2 space-y-1">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center justify-between gap-2" data-testid="print-job">
            <span>
              {job.copy ? t('Copy #{number}', { number: job.copyNumber ?? 1 }) : t('Original')}
              {job.documentType === 'invoice' && ` · ${t('Invoice')}`}
              {' · '}
              {job.channel === 'bridge' ? t('Receipt printer') : t('Print dialog')}
              {job.userName && ` · ${job.userName}`}
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              {formatDateTime(job.createdAt)}
              <Badge variant={JOB_STATUS[job.status].variant}>{t(JOB_STATUS[job.status].label)}</Badge>
            </span>
            {job.error && <span className="w-full text-xs text-red-600">{job.error}</span>}
          </li>
        ))}
        {deliveries.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {d.channel === 'email' ? t('E-mailed to {to}', { to: d.recipient ?? '—' }) : t('Shared link')}
              {d.expiresAt && ` · ${t('valid until {date}', { date: formatDateTime(d.expiresAt) })}`}
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              {formatDateTime(d.createdAt)}
              <Badge variant={DELIVERY_STATUS[d.status].variant}>{t(DELIVERY_STATUS[d.status].label)}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
