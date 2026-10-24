import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/api/orders';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const COLORS: Record<OrderStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  picked_up: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', COLORS[status])}>
      {t(ORDER_STATUS_LABELS[status])}
    </span>
  );
}
