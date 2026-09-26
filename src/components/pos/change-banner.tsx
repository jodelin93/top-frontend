'use client';

import { Banknote, CheckCircle2 } from 'lucide-react';
import type { Sale } from '@/lib/api/sales';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/**
 * After a sale: what the customer handed over and exactly what to give back,
 * in the currency chosen for the change, so the cashier never has to calculate.
 */
export function ChangeBanner({ sale }: { sale: Sale }) {
  const money = (value: number, code = sale.currencyCode) => formatMoney(Number(value), code);
  const payments = sale.payments ?? [];
  const change = Number(sale.changeAmount);
  const changeTender = sale.metadata?.changeTender;

  return (
    <div className="rounded-lg border-2 border-green-600 bg-green-50 p-3 text-green-900" role="status">
      <div className="space-y-0.5 text-sm">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between gap-2">
            <span>{t('Received|money')} · {text(p.paymentMethod?.name, t('Payment'))}</span>
            <span className="font-medium tabular-nums">
              {p.tenderedCurrency ? money(Number(p.tenderedAmount), p.tenderedCurrency) : money(Number(p.amount))}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-2 text-green-800">
          <span>{t('Sale total')}</span>
          <span className="tabular-nums">{money(Number(sale.total))}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-green-600/30 pt-2">
        {change > 0 ? (
          <>
            <span className="flex items-center gap-2 font-semibold uppercase">
              <Banknote className="h-5 w-5" />
              {t('Give back')}
            </span>
            <span className="text-right">
              <span className="block text-3xl font-bold tabular-nums" data-testid="change-due">
                {changeTender ? money(changeTender.amount, changeTender.currencyCode) : money(change)}
              </span>
              {changeTender && <span className="text-xs">= {money(change)}</span>}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            {t('Exact amount: no change to give')}
          </span>
        )}
      </div>
    </div>
  );
}
