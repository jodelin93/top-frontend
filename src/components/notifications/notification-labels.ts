import { t } from '@/i18n';
import type { AppNotification, NotificationSeverity } from '@/lib/api/notifications';
import { canUseAdmin, type User } from '@/stores/auth-store';

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

/** What a notification is about (the fields notificationLink reads) */
export type NotificationTarget = Pick<AppNotification, 'type' | 'entityType' | 'entityId'> & {
  locationId?: string | null;
};

/**
 * Where to go to act on a notification: the exact product for one low-stock item,
 * the location with "Low stock only" for a location summary, else the page.
 */
export function notificationLink(n: NotificationTarget | string): string | null {
  const target: NotificationTarget = typeof n === 'string' ? { type: n, entityType: null, entityId: null } : n;
  const { type, entityType, entityId, locationId } = target;
  if (type === 'stock.low') {
    if (entityType === 'product_variant' && entityId) {
      const params = new URLSearchParams({ variant: entityId });
      if (locationId) params.set('location', locationId);
      return `/admin/inventory?${params}`;
    }
    if (entityType === 'inventory_location' && entityId) {
      return `/admin/inventory?${new URLSearchParams({ location: entityId, lowStock: '1' })}`;
    }
    return '/admin/inventory?lowStock=1';
  }
  if (type === 'approval.stock_count') return '/admin/inventory?tab=counts';
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

/** Admin pages open only for users who can use the admin area */
export const canOpenNotificationLink = (href: string, user: User | null) =>
  href.startsWith('/admin') ? canUseAdmin(user) : true;

export const severityVariant = (severity: NotificationSeverity) =>
  severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';

export function severityLabel(severity: NotificationSeverity): string {
  if (severity === 'critical') return t('Critical');
  if (severity === 'warning') return t('Warning');
  return t('Info');
}
