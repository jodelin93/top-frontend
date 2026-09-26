'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { paymentsApi, SalePaymentState } from '@/lib/api/payments';
import { Sale, salesApi } from '@/lib/api/sales';
import { getErrorMessage } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

const STATUS_TEXT: Record<string, string> = {
  initiated: 'Sending to the terminal...',
  pending: 'Waiting for the card...',
  authorized: 'Approved, capturing...',
  captured: 'Paid',
  completed: 'Paid',
  failed: 'Declined',
  cancelled: 'Cancelled',
  unknown: 'No answer from the terminal — checking...',
  refunded: 'Refunded',
};

/**
 * Shown while a sale waits for its card payment(s) to be captured (payment_pending).
 * Polls the server, which looks payments up at the provider when they take too long.
 */
export function PaymentStatusDialog({
  sale,
  currency,
  onCompleted,
  onCancelled,
}: {
  sale: Sale | null;
  currency: string;
  onCompleted: (sale: Sale) => void;
  onCancelled: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: state, refetch } = useQuery({
    queryKey: ['pos', 'payment-state', sale?.id],
    enabled: !!sale,
    refetchInterval: (query) => {
      const data = query.state.data as SalePaymentState | undefined;
      return data && data.saleStatus !== 'payment_pending' ? false : 1500;
    },
    queryFn: async () => {
      const next = await paymentsApi.saleState(sale!.id);
      if (next.saleStatus === 'completed') {
        onCompleted(await salesApi.get(sale!.id));
      }
      return next;
    },
  });

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refetch();
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const failed = state?.payments.filter((p) => p.status === 'failed' || p.status === 'cancelled') ?? [];
  const unknown = state?.payments.filter((p) => p.status === 'unknown') ?? [];

  return (
    <Dialog open={!!sale}>
      <DialogContent
        className="max-w-md"
        // The sale must be finished or cancelled explicitly
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('Card payment')}</DialogTitle>
          <DialogDescription>
            {state?.state === 'failed'
              ? t('The card payment did not go through. Try again, or cancel and take another payment method.')
              : t('Ask the customer to follow the instructions on the card terminal.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        <ul className="divide-y rounded-md border" aria-live="polite">
          {(state?.payments ?? []).map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 p-3 text-sm">
              {payment.status === 'captured' || payment.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />
              ) : payment.status === 'failed' || payment.status === 'cancelled' ? (
                <XCircle className="h-5 w-5 text-red-600" aria-hidden />
              ) : payment.status === 'unknown' ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {payment.methodName ?? t('Payment')} · {formatMoney(payment.amount, currency)}
                </p>
                <p className="text-gray-600">
                  {STATUS_TEXT[payment.status] ? t(STATUS_TEXT[payment.status]) : payment.status}
                  {payment.failureReason && payment.status !== 'unknown' ? ` — ${payment.failureReason}` : ''}
                </p>
              </div>
              {(payment.status === 'failed' || payment.status === 'cancelled') && (
                <Button
                  size="sm"
                  className="h-10"
                  disabled={busy}
                  onClick={() => run(() => paymentsApi.retry(payment.id), 'Could not retry the payment')}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('Try again')}
                </Button>
              )}
              {payment.status === 'unknown' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10"
                  disabled={busy}
                  onClick={() => run(() => paymentsApi.lookup(payment.id), 'Could not reach the provider')}
                >
                  <Search className="h-4 w-4" />
                  {t('Check now')}
                </Button>
              )}
            </li>
          ))}
          {!state && (
            <li className="flex items-center gap-2 p-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('Starting the payment...')}
            </li>
          )}
        </ul>
        {unknown.length > 0 && (
          <p className="text-xs text-gray-500">
            {t("The terminal did not answer in time. Its result is looked up automatically — don't charge the card again until it says declined.")}
          </p>
        )}

        <Button
          variant="outline"
          className="h-11"
          disabled={busy || !sale}
          onClick={() =>
            run(async () => {
              if (!window.confirm(t('Cancel this sale? Any approved card payment is refunded.'))) return;
              await salesApi.cancel(sale!.id, failed.length ? 'Card declined' : 'Cancelled while paying');
              onCancelled();
            }, 'Could not cancel the sale')
          }
        >
          {t('Cancel sale')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
