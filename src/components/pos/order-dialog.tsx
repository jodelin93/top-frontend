'use client';

import { useState } from 'react';
import { ClipboardList, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { currencyAmountInput, useMoneyCurrencies } from '@/components/admin/currency-amount-field';
import type { PaymentMethod } from '@/lib/api/settings';
import type { OrderPaymentInput } from '@/lib/api/orders';
import { ONLINE_ONLY_TENDERS } from '@/lib/api/stored-value';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import type { CartCustomer } from '@/stores/pos-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

export interface OrderDetails {
  readyBy?: string;
  notes?: string;
  deposit?: OrderPaymentInput;
}

// Money that really moves: no on-account, gift card, store credit or points
export const depositMethods = (methods: PaymentMethod[]) =>
  methods.filter((m) => !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY' && m.code !== 'ORDER_DEPOSIT');

/** Deposit amount, currency, method and reference (shared by "take an order" and "add a deposit") */
export function DepositFields({
  methods,
  currency,
  value,
  onChange,
  autoFocus,
}: {
  methods: PaymentMethod[];
  currency: string;
  value: { amount: string; currencyCode: string; methodId: string; reference: string };
  onChange: (next: { amount: string; currencyCode: string; methodId: string; reference: string }) => void;
  autoFocus?: boolean;
}) {
  const { currencies } = useMoneyCurrencies(currency);
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-2">
      {currencies.length > 1 && (
        <Select
          value={value.currencyCode}
          onChange={(e) => set({ currencyCode: e.target.value })}
          aria-label={t('Currency')}
          className="w-24"
        >
          {currencies.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      )}
      <Input
        autoFocus={autoFocus}
        inputMode="decimal"
        value={value.amount}
        onChange={(e) => set({ amount: e.target.value })}
        placeholder={t('Amount ({currency})', { currency: value.currencyCode })}
        aria-label={t('Deposit amount ({currency})', { currency: value.currencyCode })}
        className="w-36"
      />
      <Select
        value={value.methodId}
        onChange={(e) => set({ methodId: e.target.value })}
        aria-label={t('Paid with')}
        className="w-40"
      >
        {methods.map((m) => (
          <option key={m.id} value={m.id}>
            {text(m.name, m.code)}
          </option>
        ))}
      </Select>
      <Input
        value={value.reference}
        onChange={(e) => set({ reference: e.target.value })}
        placeholder={t('Reference')}
        aria-label={t('Reference')}
        className="min-w-24 flex-1"
      />
    </div>
  );
}

/** What the deposit fields send (amount in the store currency; another currency as tendered) */
export function depositInput(
  value: { amount: string; currencyCode: string; methodId: string; reference: string },
  currency: string,
  rates: Record<string, number>
): OrderPaymentInput | null {
  const amount = Number(value.amount);
  if (!value.amount.trim() || !Number.isFinite(amount) || amount <= 0 || !value.methodId) return null;
  return {
    ...currencyAmountInput({ currencyCode: value.currencyCode, amount: value.amount }, currency, rates),
    paymentMethodId: value.methodId,
    reference: value.reference.trim() || undefined,
  };
}

/**
 * Take the cart as an order: services prepared for the customer, who pays a
 * deposit now (any amount, or none) and the rest when picking it up
 */
export function OrderDialog({
  open,
  onOpenChange,
  total,
  currency,
  paymentMethods,
  customer,
  onChooseCustomer,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency: string;
  paymentMethods: PaymentMethod[];
  customer: CartCustomer | null;
  onChooseCustomer: () => void;
  onConfirm: (details: OrderDetails) => void;
  busy: boolean;
  error: string | null;
}) {
  const methods = depositMethods(paymentMethods);
  const { rates } = useMoneyCurrencies(currency);
  const [readyBy, setReadyBy] = useState('');
  const [notes, setNotes] = useState('');
  const [typed, setDeposit] = useState({ amount: '', currencyCode: '', methodId: '', reference: '' });
  const [localError, setLocalError] = useState<string | null>(null);
  // The store currency and the first method until the cashier picks others
  const deposit = {
    ...typed,
    currencyCode: typed.currencyCode || currency,
    methodId: typed.methodId || methods[0]?.id || '',
  };

  const reset = () => {
    setReadyBy('');
    setNotes('');
    setLocalError(null);
    setDeposit({ amount: '', currencyCode: '', methodId: '', reference: '' });
  };

  const paid = deposit.amount.trim() ? depositInput(deposit, currency, rates) : null;
  const balance = Math.max(0, Math.round((total - (paid?.amount ?? 0)) * 100) / 100);

  const submit = () => {
    if (!customer) {
      setLocalError(t('Choose the customer: they come back to pick up the order.'));
      return;
    }
    if (deposit.amount.trim() && !paid) {
      setLocalError(t('Enter a deposit greater than zero, or leave it empty'));
      return;
    }
    if (paid && paid.amount > total + 0.005) {
      setLocalError(t("The deposit can't be more than the total"));
      return;
    }
    setLocalError(null);
    onConfirm({ readyBy: readyBy || undefined, notes: notes.trim() || undefined, deposit: paid ?? undefined });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('Take as an order')}
          </DialogTitle>
          <DialogDescription>
            {t('The customer pays a deposit now and the rest when they pick the order up. The deposit goes into your cash session today.')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('Customer')}</span>
            <Button type="button" variant="outline" className="h-11 w-full justify-start" onClick={onChooseCustomer}>
              <User className="h-4 w-4" />
              {customer ? customer.name : t('Choose the customer')}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('Ready by')}</span>
              <Input type="date" value={readyBy} onChange={(e) => setReadyBy(e.target.value)} />
            </label>
            <div className="space-y-1 text-sm">
              <span className="font-medium">{t('Total')}</span>
              <p className="flex h-10 items-center text-lg font-semibold tabular-nums">{formatMoney(total, currency)}</p>
            </div>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('Notes for the preparation')}</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder={t('Size, colours, text to print...')} />
          </label>
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">{t('Deposit (optional)')}</p>
            <DepositFields methods={methods} currency={currency} value={deposit} onChange={setDeposit} />
            <div className="flex justify-between text-sm">
              <span>{t('Balance due at pickup')}</span>
              <span className={cn('font-semibold tabular-nums', balance > 0 ? 'text-amber-700' : 'text-green-700')}>
                {formatMoney(balance, currency)}
              </span>
            </div>
          </div>
          <ErrorMessage>{localError ?? error}</ErrorMessage>
          <div className={cn('grid grid-cols-2 gap-2', dialogStickyFooter)}>
            <Button type="button" variant="outline" className="h-12" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" className="h-12" disabled={busy}>
              {busy ? t('Saving...') : t('Take the order')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
