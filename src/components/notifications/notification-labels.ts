import { t } from '@/i18n';
import type { NotificationSeverity } from '@/lib/api/notifications';

/** Translated name of a notification type (the server's titles stay in English) */
export function notificationTypeLabel(type: string): string {
  switch (type) {
    case 'stock.low':
      return t('Low stock');
    case 'approval.expense':
      return t('Expenses waiting for approval');
    case 'approval.purchase_order':
      return t('Purchase orders waiting for approval');
    case 'approval.stock_count':
      return t('Stock counts waiting for approval');
    case 'shift.variance':
      return t('Cash variance over tolerance');
    case 'payment.unresolved':
      return t('Card payments needing review');
    case 'payment.settlement_unmatched':
      return t('Unmatched card settlement lines');
    case 'device.unsynced':
      return t('Devices with unsynced sales');
    case 'backup.failed':
      return t('Backup failed');
    case 'reconciliation.issues':
      return t('Reconciliation found issues');
    case 'outbox.stalled':
      return t('Background events are stuck');
    default:
      return type;
  }
}

/** Where to go to act on a notification */
export function notificationLink(type: string): string | null {
  if (type === 'stock.low' || type === 'approval.stock_count') return '/admin/inventory';
  if (type === 'approval.expense') return '/admin/expenses';
  if (type === 'approval.purchase_order') return '/admin/purchasing';
  if (type === 'shift.variance') return '/admin/shifts';
  if (type.startsWith('payment.')) return '/admin/payments';
  if (type === 'device.unsynced') return '/admin/devices';
  if (type === 'reconciliation.issues' || type === 'outbox.stalled' || type === 'backup.failed') {
    return '/admin/system-events';
  }
  return null;
}

export const severityVariant = (severity: NotificationSeverity) =>
  severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';

export function severityLabel(severity: NotificationSeverity): string {
  if (severity === 'critical') return t('Critical');
  if (severity === 'warning') return t('Warning');
  return t('Info');
}
