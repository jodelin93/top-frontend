'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Search, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { OrderDetail } from '@/components/orders/order-detail';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Order, orderCustomerName, ordersApi } from '@/lib/api/orders';
import type { PaymentMethod } from '@/lib/api/settings';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Orders waiting for their customer at this till's branch: find one by number,
 * name or phone, take another deposit, mark it ready, or pick it up (it goes into
 * the cart and the customer pays the balance).
 */
export function OrdersDialog({
  open,
  onOpenChange,
  branchId,
  registerId,
  online,
  paymentMethods,
  onPickUp,
  onPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string | null;
  registerId: string | null;
  online: boolean;
  paymentMethods: PaymentMethod[];
  onPickUp: (order: Order) => Promise<void>;
  onPrint: (order: Order, title?: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'till', branchId, debounced],
    queryFn: () => ordersApi.list({ status: 'active', branchId: branchId ?? undefined, search: debounced || undefined, limit: 50 }),
    enabled: open && online,
  });
  const orders = data?.data ?? [];

  const close = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setSearch('');
      setPickError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selected ? (
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label={t('Back to the orders')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <ClipboardList className="h-5 w-5" />
            )}
            {t('Orders')}
          </DialogTitle>
          <DialogDescription>
            {t('Orders in preparation or ready, with their deposits. Pick one up to take the balance.')}
          </DialogDescription>
        </DialogHeader>
        {!online ? (
          <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <WifiOff className="h-4 w-4" />
            {t('Orders need a connection.')}
          </p>
        ) : selected ? (
          <div className="max-h-[65vh] overflow-y-auto">
            <ErrorMessage>{pickError}</ErrorMessage>
            <OrderDetail
              orderId={selected}
              paymentMethods={paymentMethods}
              registerId={registerId}
              onPrint={onPrint}
              onPickUp={async (order) => {
                setPickError(null);
                try {
                  await onPickUp(order);
                  close(false);
                } catch (err) {
                  setPickError(getErrorMessage(err, 'Could not load the order into the cart'));
                }
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Order number, customer name or phone...')}
                className="pl-9"
              />
            </div>
            <ErrorMessage>{error ? getErrorMessage(error, 'Could not load the orders') : null}</ErrorMessage>
            <ul className="max-h-[55vh] divide-y overflow-y-auto rounded-md border">
              {isLoading && <li className="p-4 text-center text-sm text-gray-500">{t('Loading...')}</li>}
              {!isLoading && orders.length === 0 && (
                <li className="p-4 text-center text-sm text-gray-500">
                  {debounced ? t('No orders match.') : t('No orders waiting.')}
                </li>
              )}
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(order.id)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs">{order.orderNumber}</span>
                        <OrderStatusBadge status={order.status} />
                      </span>
                      <span className="block truncate font-medium">{orderCustomerName(order)}</span>
                      <span className="block text-xs text-gray-500">
                        {order.readyBy ? t('Ready by {date}', { date: formatDate(order.readyBy) }) : t('No ready date')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block font-semibold">{formatMoney(Number(order.total), order.currencyCode)}</span>
                      <span className="block text-xs text-amber-700">
                        {t('Due {amount}', { amount: formatMoney(Number(order.balanceDue), order.currencyCode) })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
