'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, HandCoins, PackageCheck, Pencil, Printer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorMessage } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { useMoneyCurrencies } from '@/components/admin/currency-amount-field';
import { DepositFields, depositInput, depositMethods } from '@/components/pos/order-dialog';
import { OrderStatusBadge } from './order-status-badge';
import { isActiveOrder, Order, orderCustomerName, ordersApi } from '@/lib/api/orders';
import type { PaymentMethod } from '@/lib/api/settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { formatQuantity } from '@/lib/pos/quantity';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Panel = 'deposit' | 'cancel' | 'details' | null;

/**
 * One order: its lines, deposits and balance, and what can be done with it
 * (another deposit, ready / back in preparation, pickup at the till, cancel).
 * `registerId`: the till's register (cash deposits and refunds go into its open
 * session); in the back office a register is chosen for cash.
 */
export function OrderDetail({
  orderId,
  paymentMethods,
  registerId,
  registers = [],
  onPickUp,
  onPrint,
}: {
  orderId: string;
  paymentMethods: PaymentMethod[];
  registerId?: string | null;
  registers?: { id: string; name: string; branchId: string }[];
  onPickUp?: (order: Order) => void;
  onPrint: (order: Order, title?: string) => void;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { withApproval, approvalDialog } = useApproval();
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: order, isLoading, error: loadError } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => ordersApi.get(orderId),
  });
  const currency = order?.currencyCode ?? 'USD';
  const money = (value: number) => formatMoney(Number(value), currency);
  const methods = depositMethods(paymentMethods);
  const { rates } = useMoneyCurrencies(currency);
  const branchRegisters = registers.filter((r) => r.branchId === order?.branchId);

  // Deposit form
  const [deposit, setDeposit] = useState({ amount: '', currencyCode: '', methodId: '', reference: '' });
  const depositKey = useRef(newIdempotencyKey());
  // Cancel form
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<'refund' | 'keep'>('refund');
  const [refundMethodId, setRefundMethodId] = useState('');
  const [refundRegisterId, setRefundRegisterId] = useState('');
  const [reference, setReference] = useState('');
  // Ready date and notes form
  const [details, setDetails] = useState({ readyBy: '', notes: '' });

  const refresh = (updated: Order) => {
    queryClient.setQueryData(['orders', orderId], updated);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const run = async (work: () => Promise<Order>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await work();
      refresh(updated);
      return updated;
    } catch (err) {
      setError(getErrorMessage(err, fallback));
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="py-6 text-center text-sm text-gray-500">{t('Loading...')}</p>;
  if (!order) return <ErrorMessage>{getErrorMessage(loadError, 'Could not load the order')}</ErrorMessage>;

  const active = isActiveOrder(order);
  const canCancel = hasPermission(user, 'orders.cancel');
  const canManageOrders = hasPermission(user, 'orders.manage');
  const cashRegister = registerId ?? (refundRegisterId || branchRegisters[0]?.id || null);
  // A cancellation gives each deposit back the way it was paid (per method and
  // currency handed over, as the server does); a method turned off since needs
  // another way, chosen here
  const refundParts = Object.values(
    (order.payments ?? []).reduce<Record<string, { methodId: string; method?: PaymentMethod; currency: string | null; amount: number; tendered: number }>>(
      (parts, p) => {
        const key = `${p.paymentMethodId}:${p.tenderedCurrency ?? ''}`;
        const part = (parts[key] ??= { methodId: p.paymentMethodId, method: p.paymentMethod, currency: p.tenderedCurrency, amount: 0, tendered: 0 });
        const sign = p.type === 'deposit' ? 1 : -1;
        part.amount += sign * Number(p.amount);
        part.tendered += sign * Number(p.tenderedAmount ?? p.amount);
        return parts;
      },
      {}
    )
  ).filter((part) => part.amount > 0.005);
  const unavailable = refundParts.filter((part) => !methods.some((m) => m.id === part.methodId));
  const fallbackRefund = unavailable.length ? methods.find((m) => m.id === (refundMethodId || methods[0]?.id)) : undefined;
  const refundTypes = refundParts.map((part) => (methods.some((m) => m.id === part.methodId) ? part.method?.methodType : fallbackRefund?.methodType));
  const refundsCash = refundTypes.includes('cash');
  const refundsOther = refundTypes.some((type) => type !== 'cash');

  const addDeposit = async () => {
    const input = depositInput(
      { ...deposit, currencyCode: deposit.currencyCode || currency, methodId: deposit.methodId || methods[0]?.id || '' },
      currency,
      rates
    );
    if (!input) {
      setError(t('Enter an amount greater than zero'));
      return;
    }
    const target = registerId ?? branchRegisters[0]?.id;
    if (!target) {
      setError(t('Take deposits at the till'));
      return;
    }
    const updated = await run(
      () => ordersApi.addDeposit(order.id, { ...input, registerId: target, idempotencyKey: depositKey.current }),
      'Could not record the deposit'
    );
    if (updated) {
      depositKey.current = newIdempotencyKey();
      setDeposit({ amount: '', currencyCode: deposit.currencyCode, methodId: deposit.methodId, reference: '' });
      setPanel(null);
      onPrint(updated, t('Deposit recorded'));
    }
  };

  const editDetails = () => {
    setDetails({ readyBy: order.readyBy ? order.readyBy.slice(0, 10) : '', notes: order.notes ?? '' });
    setError(null);
    setPanel('details');
  };

  const saveDetails = async () => {
    const updated = await run(
      () => ordersApi.update(order.id, { readyBy: details.readyBy || null, notes: details.notes.trim() || null }),
      'Could not update the order'
    );
    if (updated) setPanel(null);
  };

  const cancel = async () => {
    if (reason.trim().length < 3) {
      setError(t('Give the reason for the cancellation'));
      return;
    }
    const refunding = outcome === 'refund' && Number(order.paidAmount) > 0;
    const updated = await run(
      () =>
        withApproval((headers) =>
          ordersApi.cancel(
            order.id,
            {
              reason: reason.trim(),
              deposits: outcome,
              ...(refunding && {
                refundMethodId: fallbackRefund?.id,
                registerId: refundsCash ? (cashRegister ?? undefined) : undefined,
                reference: refundsOther ? reference.trim() || undefined : undefined,
              }),
            },
            headers
          )
        ),
      'Could not cancel the order'
    );
    if (updated) setPanel(null);
  };

  return (
    <div className="space-y-4 text-sm">
      {approvalDialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold">
            <span className="font-mono">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
          </p>
          <p>{orderCustomerName(order)}{order.customer?.phone ? ` · ${order.customer.phone}` : ''}</p>
          <p className="text-xs text-gray-500">
            {t('Taken {date} by {name}', { date: formatDateTime(order.createdAt), name: order.user?.name ?? '—' })}
            {order.branch?.name ? ` · ${order.branch.name}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{t('Ready by')}</p>
          <p className="font-medium">{order.readyBy ? formatDate(order.readyBy) : '—'}</p>
        </div>
      </div>
      {order.notes && <p className="whitespace-pre-line rounded-md bg-gray-50 p-2">{order.notes}</p>}

      <table className="w-full">
        <tbody>
          {order.items?.map((item) => (
            <tr key={item.id} className="border-b align-top last:border-0">
              <td className="py-1.5 pr-2">
                {item.productName}
                {item.variantName && <span className="text-gray-500"> ({item.variantName})</span>}
                {item.note && <p className="text-xs italic text-gray-600">{item.note}</p>}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatQuantity(Number(item.quantity), null)}</td>
              <td className="py-1.5 text-right tabular-nums">{money(Number(item.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 rounded-md border p-3">
        <Line label={t('Total')} value={money(order.total)} bold />
        <Line label={t('Deposits paid')} value={money(order.paidAmount)} className="text-green-700" />
        {active && <Line label={t('Balance due at pickup')} value={money(order.balanceDue)} bold className="text-amber-700" />}
      </div>

      {(order.payments?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1 font-medium">{t('Deposits')}</p>
          <ul className="divide-y rounded-md border">
            {order.payments!.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="min-w-0">
                  <span className={cn(p.type === 'refund' && 'text-red-700')}>
                    {p.type === 'refund' ? t('Refunded') : t('Deposit')} · {text(p.paymentMethod?.name, t('Payment'))}
                    {p.reference ? ` #${p.reference}` : ''}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {formatDateTime(p.createdAt)}
                    {p.userName ? ` · ${p.userName}` : ''}
                  </span>
                </span>
                <span className={cn('tabular-nums', p.type === 'refund' && 'text-red-700')}>
                  {p.type === 'refund' ? '-' : ''}
                  {p.tenderedCurrency
                    ? `${formatMoney(Number(p.tenderedAmount), p.tenderedCurrency)} (${money(p.amount)})`
                    : money(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.status === 'picked_up' && (
        <p className="rounded-md bg-green-50 p-2 text-green-800">
          {t('Picked up {date}: sale {number}', {
            date: order.pickedUpAt ? formatDateTime(order.pickedUpAt) : '',
            number: order.saleNumber ?? '',
          })}
        </p>
      )}
      {order.status === 'cancelled' && (
        <p className="rounded-md bg-red-50 p-2 text-red-800">
          {t('Cancelled {date}: {reason}', {
            date: order.cancelledAt ? formatDateTime(order.cancelledAt) : '',
            reason: order.cancelReason ?? '',
          })}
          {order.depositOutcome === 'refunded' && ` · ${t('Deposits refunded')}`}
          {order.depositOutcome === 'kept' && ` · ${t('Deposits kept: {amount}', { amount: money(order.paidAmount) })}`}
        </p>
      )}

      <ErrorMessage>{error}</ErrorMessage>

      {panel === 'deposit' && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="font-medium">{t('Another deposit')}</p>
          <DepositFields
            methods={methods}
            currency={currency}
            value={{
              ...deposit,
              currencyCode: deposit.currencyCode || currency,
              methodId: deposit.methodId || methods[0]?.id || '',
            }}
            onChange={setDeposit}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPanel(null)}>
              {t('Cancel')}
            </Button>
            <Button onClick={addDeposit} disabled={busy}>
              {busy ? t('Saving...') : t('Record the deposit')}
            </Button>
          </div>
        </div>
      )}

      {panel === 'details' && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="block space-y-1">
            <span className="font-medium">{t('Ready by')}</span>
            <Input type="date" value={details.readyBy} onChange={(e) => setDetails({ ...details, readyBy: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">{t('Notes for the preparation')}</span>
            <Input
              value={details.notes}
              onChange={(e) => setDetails({ ...details, notes: e.target.value })}
              maxLength={1000}
              placeholder={t('Size, colours, text to print...')}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPanel(null)}>
              {t('Back')}
            </Button>
            <Button onClick={saveDetails} disabled={busy}>
              {busy ? t('Saving...') : t('Save')}
            </Button>
          </div>
        </div>
      )}

      {panel === 'cancel' && (
        <div className="space-y-2 rounded-md border border-red-200 p-3">
          <p className="font-medium">{t('Cancel the order')}</p>
          {!canCancel && <p className="text-xs text-gray-600">{t("Cancelling an order needs a manager's approval.")}</p>}
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Reason')} aria-label={t('Reason')} maxLength={500} />
          {Number(order.paidAmount) > 0 && (
            <>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={outcome === 'refund'} onChange={() => setOutcome('refund')} />
                  {t('Give the deposits back ({amount})', { amount: money(order.paidAmount) })}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={outcome === 'keep'} onChange={() => setOutcome('keep')} />
                  {t('Keep the deposits')}
                </label>
              </div>
              {outcome === 'refund' && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">{t('Given back the way each deposit was paid:')}</p>
                    <ul className="text-sm">
                      {refundParts.map((part) => (
                        <li key={`${part.methodId}:${part.currency ?? ''}`} className="flex justify-between gap-2">
                          <span>{text(part.method?.name, t('Payment'))}</span>
                          <span className="tabular-nums">
                            {part.currency && part.currency !== currency
                              ? `${formatMoney(part.tendered, part.currency)} (${money(part.amount)})`
                              : money(part.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unavailable.length > 0 && (
                      <Select
                        value={fallbackRefund?.id ?? ''}
                        onChange={(e) => setRefundMethodId(e.target.value)}
                        aria-label={t('Given back with')}
                        title={t('A way of paying used for a deposit can no longer be used: choose how to give it back')}
                        className="w-40"
                      >
                        {methods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {text(m.name, m.code)}
                          </option>
                        ))}
                      </Select>
                    )}
                    {!registerId && refundsCash && branchRegisters.length > 0 && (
                      <Select
                        value={cashRegister ?? ''}
                        onChange={(e) => setRefundRegisterId(e.target.value)}
                        aria-label={t('Register')}
                        className="w-40"
                      >
                        {branchRegisters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </Select>
                    )}
                    {refundsOther && (
                      <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder={t('Reference')}
                        aria-label={t('Reference')}
                        className="min-w-24 flex-1"
                      />
                    )}
                  </div>
                  {unavailable.length > 0 && (
                    <p className="text-xs text-amber-700">{t('A way of paying used for a deposit can no longer be used: choose how to give it back')}</p>
                  )}
                  {refundsCash && <p className="text-xs text-gray-600">{t('The cash comes out of your open cash session on this register.')}</p>}
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPanel(null)}>
              {t('Back')}
            </Button>
            <Button variant="destructive" onClick={cancel} disabled={busy}>
              {busy ? t('Saving...') : t('Cancel the order')}
            </Button>
          </div>
        </div>
      )}

      {!panel && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onPrint(order, t('Order receipt'))}>
            <Printer className="h-4 w-4" />
            {t('Print')}
          </Button>
          {active && canManageOrders && (
            <Button variant="outline" onClick={editDetails}>
              <Pencil className="h-4 w-4" />
              {t('Edit details')}
            </Button>
          )}
          {active && Number(order.balanceDue) > 0 && (
            <Button variant="outline" onClick={() => setPanel('deposit')}>
              <HandCoins className="h-4 w-4" />
              {t('Add a deposit')}
            </Button>
          )}
          {order.status === 'open' && (
            <Button variant="outline" disabled={busy} onClick={() => run(() => ordersApi.setStatus(order.id, 'ready'), 'Could not update the order')}>
              <CheckCircle2 className="h-4 w-4" />
              {t('Mark ready')}
            </Button>
          )}
          {order.status === 'ready' && (
            <Button variant="outline" disabled={busy} onClick={() => run(() => ordersApi.setStatus(order.id, 'open'), 'Could not update the order')}>
              <RotateCcw className="h-4 w-4" />
              {t('Back in preparation')}
            </Button>
          )}
          {active && onPickUp && (
            <Button onClick={() => onPickUp(order)}>
              <PackageCheck className="h-4 w-4" />
              {t('Pick up: take the balance')}
            </Button>
          )}
          {active && (
            <Button variant="ghost" className="text-red-700" onClick={() => setPanel('cancel')}>
              <Ban className="h-4 w-4" />
              {t('Cancel the order')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={cn('flex justify-between', bold && 'font-semibold', className)}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
