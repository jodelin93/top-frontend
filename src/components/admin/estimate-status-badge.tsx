import { Badge } from '@/components/ui/badge';
import type { Estimate, EstimateStatus } from '@/lib/api/estimates';
import { t } from '@/i18n';

export const estimateStatusLabel: Record<EstimateStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'danger' },
  converted: { label: 'Sold', variant: 'success' },
};

export function EstimateStatusBadge({ estimate }: { estimate: Pick<Estimate, 'status' | 'expired'> }) {
  if (estimate.expired) return <Badge variant="warning">{t('Expired')}</Badge>;
  const { label, variant } = estimateStatusLabel[estimate.status];
  return <Badge variant={variant}>{t(label)}</Badge>;
}
