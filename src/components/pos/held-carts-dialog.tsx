'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlayCircle, Trash2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { Sale, salesApi } from '@/lib/api/sales';
import { customerName } from '@/lib/api/customers';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Carts parked on the server (R042). Resuming loads one into this till; holding needs
 * a connection because the stock is reserved on the server.
 */
export function HeldCartsDialog({
  open,
  onOpenChange,
  registerId,
  branchId,
  currency,
  online,
  onResume,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registerId: string | null;
  branchId: string | null;
  currency: string;
  online: boolean;
  onResume: (sale: Sale) => Promise<void>;
}) {
  const [scope, setScope] = useState<'register' | 'branch'>('register');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: held = [], isLoading, refetch } = useQuery({
    queryKey: ['pos', 'held', scope, registerId, branchId],
    queryFn: () =>
      salesApi.held(scope === 'register' ? { registerId: registerId ?? undefined } : { branchId: branchId ?? undefined }),
    enabled: open && online,
  });

  const act = async (sale: Sale, action: 'resume' | 'cancel') => {
    setBusyId(sale.id);
    setError(null);
    try {
      if (action === 'resume') {
        await onResume(sale);
      } else {
        await salesApi.cancel(sale.id, 'Held cart cancelled');
        await refetch();
      }
    } catch (err) {
      setError(getErrorMessage(err, action === 'resume' ? 'Could not resume the cart' : 'Could not cancel the cart'));
      await refetch();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Held carts')}</DialogTitle>
          <DialogDescription>{t('Parked sales keep their items reserved until they expire.')}</DialogDescription>
        </DialogHeader>

        {!online ? (
          <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t('Held carts are kept on the server. Holding or resuming a cart needs a connection.')}
          </p>
        ) : (
          <>
            <div className="flex overflow-hidden rounded-md border text-sm" role="tablist" aria-label={t('Which held carts')}>
              {(['register', 'branch'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={scope === value}
                  onClick={() => setScope(value)}
                  className={cn('h-10 flex-1', scope === value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700')}
                >
                  {value === 'register' ? t('This register') : t('Whole store')}
                </button>
              ))}
            </div>
            <ErrorMessage>{error}</ErrorMessage>
            {isLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">{t('Loading...')}</p>
            ) : held.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">{t('No held carts.')}</p>
            ) : (
              <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
                {held.map((sale) => (
                  <li key={sale.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {sale.heldLabel || (sale.customer ? customerName(sale.customer) : t('Walk-in customer'))}
                        <span className="ml-2 font-mono text-xs text-gray-500">{sale.saleNumber}</span>
                      </p>
                      <p className="truncate text-sm text-gray-600">
                        {(sale.items ?? []).map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('Held {date}', { date: formatDateTime(sale.saleDate) })}
                        {sale.user && ` ${t('by {name}', { name: sale.user.firstName ?? sale.user.email })}`}
                        {sale.register && scope === 'branch' && ` · ${sale.register.name}`}
                        {sale.heldUntil && ` · ${t('expires {date}', { date: formatDateTime(sale.heldUntil) })}`}
                      </p>
                    </div>
                    <span className="font-semibold">{formatMoney(sale.total, currency)}</span>
                    <Button
                      className="h-11"
                      onClick={() => act(sale, 'resume')}
                      disabled={!!busyId}
                      aria-label={t('Resume cart {number}', { number: sale.saleNumber })}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {t('Resume')}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => {
                        if (window.confirm(t('Cancel held cart {number}? Its items go back on sale.', { number: sale.saleNumber }))) {
                          act(sale, 'cancel');
                        }
                      }}
                      disabled={!!busyId}
                      aria-label={t('Cancel held cart {number}', { number: sale.saleNumber })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
