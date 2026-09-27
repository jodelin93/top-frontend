'use client';

import { useMemo, useState } from 'react';
import { Banknote, BookOpen, CreditCard, Gift, Ticket, Trash2, Wallet, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  dialogStickyFooter,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import type { PaymentMethod } from '@/lib/api/settings';
import type { PaymentMethodWithProvider } from '@/lib/api/payments';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { round2 } from '@/lib/pos/sale-calculator';
import { acceptedCurrencies, amountDueIn, changeIn, exchangeRate, toSaleCurrency } from '@/lib/pos/currency-math';
import { LoyaltyRules, loyaltyMath } from '@/lib/api/loyalty';
import {
  EXCHANGE_CREDIT_CODE,
  GIFT_CARD_CODE,
  ON_ACCOUNT_CODE,
  STORE_CREDIT_CODE,
  storedValueApi,
} from '@/lib/api/stored-value';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

export interface TenderedPayment {
  paymentMethodId: string;
  // In the sale currency
  amount: number;
  reference?: string;
  // Paid in another currency: the amount handed over in it and the rate used
  currencyCode?: string;
  tenderedAmount?: number;
  exchangeRate?: number;
  // Gift card tender: the card's code (the server looks it up by its hash)
  giftCardCode?: string;
}

// Exact sale-currency value of a payment (foreign amounts are not rounded)
const exactValue = (p: TenderedPayment) =>
  p.tenderedAmount && p.exchangeRate ? toSaleCurrency(p.tenderedAmount, p.exchangeRate) : p.amount;

// Suggested cash amounts: exact, then the next round notes above the amount due.
// Notes scale with the currency (HTG notes are ~100× USD ones).
function cashSuggestions(due: number, rate: number): number[] {
  const scale = rate >= 10 ? 10 ** Math.floor(Math.log10(rate)) : 1;
  const steps = [5, 10, 20, 50, 100].map((s) => s * scale);
  const suggestions = new Set<number>([round2(due)]);
  for (const step of steps) {
    suggestions.add(Math.ceil(due / step) * step);
  }
  return [...suggestions].filter((v) => v >= due).sort((a, b) => a - b).slice(0, 5);
}

// Card methods on an integrated terminal: charged by the provider after "Complete sale",
// so the cashier types no approval code. 'manual' = standalone terminal (code typed in).
export const isIntegrated = (method: PaymentMethod | undefined, online: boolean) => {
  const provider = (method as PaymentMethodWithProvider | undefined)?.provider;
  return online && !!method && method.methodType !== 'cash' && !!provider && provider !== 'manual';
};

/**
 * Take one or more payments (split tender) for the amount due, in the sale currency
 * or any other currency the store accepts (Settings → exchange rates).
 */
export function PaymentDialog({
  open,
  onOpenChange,
  amountDue,
  currency,
  storeCurrency,
  exchangeRates,
  paymentMethods,
  online,
  submitting,
  error,
  onComplete,
  loyalty,
  customer,
  storeCreditBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  // Sale (branch) currency
  currency: string;
  // Currency the exchange rates are quoted against
  storeCurrency: string;
  exchangeRates: Record<string, number>;
  paymentMethods: PaymentMethod[];
  online: boolean;
  submitting: boolean;
  error: string | null;
  onComplete: (payments: TenderedPayment[], changeCurrency?: string) => void;
  // The sale's customer points balance and the store's rules (null: no customer / programme off)
  loyalty?: { points: number; rules: LoyaltyRules } | null;
  // The sale's customer (on account and store credit need one)
  customer?: { id: string; name: string } | null;
  // The customer's store credit balance (null: none / unknown)
  storeCreditBalance?: number | null;
}) {
  const [payments, setPayments] = useState<TenderedPayment[]>([]);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [tenderCurrency, setTenderCurrency] = useState(currency);
  const [changeCurrency, setChangeCurrency] = useState(currency);
  // Gift card being used: its code and the balance the server reported
  const [giftCode, setGiftCode] = useState('');
  const [giftCard, setGiftCard] = useState<{ code: string; balance: number; last4: string | null } | null>(null);
  const [checkingGift, setCheckingGift] = useState(false);

  const currencies = useMemo(() => {
    const list = acceptedCurrencies(exchangeRates, storeCurrency);
    // The sale currency first (a branch may sell in another currency than the store's)
    return [currency, ...list.filter((c) => c !== currency && exchangeRate(exchangeRates, storeCurrency, currency, c))];
  }, [exchangeRates, storeCurrency, currency]);
  const rateOf = (code: string) => exchangeRate(exchangeRates, storeCurrency, currency, code) ?? 1;

  const money = (value: number, code = currency) => formatMoney(value, code);
  const methods = useMemo(() => new Map(paymentMethods.map((m) => [m.id, m])), [paymentMethods]);
  const exactPaid = payments.reduce((sum, p) => sum + exactValue(p), 0);
  const paid = round2(exactPaid);
  // Half a cent of rounding from foreign amounts is not "remaining"
  const remaining = amountDue - exactPaid > 0.005 ? round2(amountDue - exactPaid) : 0;
  const exactRemaining = Math.max(0, amountDue - exactPaid);
  const change = round2(Math.max(exactPaid - amountDue, 0));
  const cashPaid = payments
    .filter((p) => methods.get(p.paymentMethodId)?.methodType === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const selected = methodId ? methods.get(methodId) : undefined;
  const isPoints = (m?: PaymentMethod) => m?.code === 'LOYALTY';
  const isOnAccount = (m?: PaymentMethod) => m?.code === ON_ACCOUNT_CODE;
  const isGiftCard = (m?: PaymentMethod) => m?.code === GIFT_CARD_CODE;
  const isStoreCredit = (m?: PaymentMethod) => m?.code === STORE_CREDIT_CODE;
  // Always paid in the sale currency
  const isSpecial = (m?: PaymentMethod) => isPoints(m) || isOnAccount(m) || isGiftCard(m) || isStoreCredit(m);
  const paidWith = (predicate: (m?: PaymentMethod) => boolean) =>
    payments.filter((p) => predicate(methods.get(p.paymentMethodId))).reduce((sum, p) => sum + p.amount, 0);
  const storeCreditLeft = round2(Math.max(0, (storeCreditBalance ?? 0) - paidWith(isStoreCredit)));
  const giftCardLeft = giftCard
    ? round2(
        Math.max(
          0,
          giftCard.balance -
            payments
              .filter((p) => p.giftCardCode && p.giftCardCode === giftCard.code)
              .reduce((sum, p) => sum + p.amount, 0)
        )
      )
    : 0;
  // Points, account, gift cards and store credit are always in the sale currency
  const activeCurrency = isSpecial(selected) ? currency : tenderCurrency;
  const activeRate = rateOf(activeCurrency);
  const foreign = activeCurrency !== currency;
  const dueInActive = foreign ? amountDueIn(exactRemaining, activeRate) : remaining;

  // Paying with points needs a customer with points and a connection (balance checked live).
  // loyalty turns null while the dialog is still showing once the sale completes (cart cleared).
  const pointsAvailable = loyalty && online ? loyalty.points : 0;
  const pointsUsed = loyalty
    ? payments
        .filter((p) => isPoints(methods.get(p.paymentMethodId)))
        .reduce((sum, p) => sum + loyaltyMath.pointsFor(loyalty.rules, p.amount), 0)
    : 0;
  const maxPointsPayment = loyalty
    ? round2(
        Math.min(
          remaining,
          loyaltyMath.valueOf(loyalty.rules, pointsAvailable - pointsUsed),
          (amountDue * loyalty.rules.maxRedeemPercent) / 100 -
            payments.filter((p) => isPoints(methods.get(p.paymentMethodId))).reduce((a, p) => a + p.amount, 0)
        )
      )
    : 0;
  // Why the points method can't be used right now (shown on the button), or null
  const pointsBlocked = (): string | null => {
    if (!loyalty) return t('Add a customer to use points');
    if (!online) return t('Needs a connection');
    if (pointsAvailable - pointsUsed < loyalty.rules.minRedeemPoints) {
      return t('Needs {points} pts', { points: loyalty.rules.minRedeemPoints });
    }
    if (maxPointsPayment <= 0) return t('Limit reached for this sale');
    return null;
  };
  // Why a special tender can't be used right now (shown on the button), or null
  const specialBlocked = (m: PaymentMethod): string | null => {
    if (isPoints(m)) return pointsBlocked();
    if (!isOnAccount(m) && !isGiftCard(m) && !isStoreCredit(m)) return null;
    if (!online) return t('Needs a connection');
    if ((isOnAccount(m) || isStoreCredit(m)) && !customer) return t('Add a customer first');
    if (isStoreCredit(m) && storeCreditLeft <= 0) return t('No store credit left');
    return null;
  };
  // Points show when the customer has some, store credit when they have a balance;
  // exchange credit is only used by exchanges
  const visibleMethods = paymentMethods.filter(
    (m) =>
      m.code !== EXCHANGE_CREDIT_CODE &&
      (!isPoints(m) || (loyalty && loyalty.points > 0)) &&
      (!isStoreCredit(m) || (customer && (storeCreditBalance ?? 0) > 0))
  );

  const reset = () => {
    setPayments([]);
    setMethodId(null);
    setAmount('');
    setReference('');
    setLocalError(null);
    setTenderCurrency(currency);
    setChangeCurrency(currency);
    setGiftCode('');
    setGiftCard(null);
  };

  // Every opening starts a fresh payment: the page also closes the dialog itself (sale
  // completed, card sale sent to the terminal), which does not go through
  // handleOpenChange, so the lines and currency of the last sale must not carry over.
  // While it stays open (e.g. a manager approval was cancelled) the payments are kept.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) reset();
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const suggestedAmount = (id: string, code: string) => {
    const method = methods.get(id);
    if (isPoints(method)) return maxPointsPayment;
    if (isStoreCredit(method)) return round2(Math.min(remaining, storeCreditLeft));
    if (isGiftCard(method)) return giftCard ? round2(Math.min(remaining, giftCardLeft)) : 0;
    return code === currency ? remaining : amountDueIn(exactRemaining, rateOf(code));
  };

  const selectMethod = (id: string) => {
    setMethodId(id);
    const max = suggestedAmount(id, isSpecial(methods.get(id)) ? currency : tenderCurrency);
    setAmount(max > 0 ? max.toFixed(2) : '');
    setReference('');
    setLocalError(null);
  };

  // Look the card up by its code: its balance decides how much it can pay
  const checkGiftCard = async () => {
    const code = giftCode.trim();
    if (!code) return;
    setCheckingGift(true);
    setLocalError(null);
    try {
      const card = await storedValueApi.lookupGiftCard(code);
      if (card.status !== 'active') {
        setGiftCard(null);
        setLocalError(card.status === 'pending' ? t('This gift card is not active yet') : t('This gift card is cancelled'));
        return;
      }
      const found = { code, balance: Number(card.balance), last4: card.last4 };
      setGiftCard(found);
      const used = payments.filter((p) => p.giftCardCode === code).reduce((sum, p) => sum + p.amount, 0);
      const max = round2(Math.min(remaining, Math.max(0, found.balance - used)));
      setAmount(max > 0 ? max.toFixed(2) : '');
    } catch (err) {
      setGiftCard(null);
      setLocalError(getErrorMessage(err, 'Gift card not found'));
    } finally {
      setCheckingGift(false);
    }
  };

  const selectCurrency = (code: string) => {
    setTenderCurrency(code);
    if (methodId && !isSpecial(selected)) {
      const max = suggestedAmount(methodId, code);
      setAmount(max > 0 ? max.toFixed(2) : '');
    }
    setLocalError(null);
  };

  const addPayment = (preset?: number) => {
    if (!selected) return;
    const value = preset ?? Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError(t('Enter an amount greater than zero'));
      return;
    }
    // Only cash can be more than what's left to pay (the difference is change)
    if (selected.methodType !== 'cash' && round2(value) > dueInActive) {
      setLocalError(
        t("{method} can't exceed the remaining {amount}", {
          method: text(selected.name),
          amount: money(dueInActive, activeCurrency),
        })
      );
      return;
    }
    if (isPoints(selected) && loyalty) {
      if (round2(value) > maxPointsPayment) {
        setLocalError(t('Points can pay at most {amount} of this sale', { amount: money(maxPointsPayment) }));
        return;
      }
      if (loyaltyMath.pointsFor(loyalty.rules, value) < loyalty.rules.minRedeemPoints) {
        setLocalError(t('At least {points} points must be used at once', { points: loyalty.rules.minRedeemPoints }));
        return;
      }
    }
    if (isStoreCredit(selected) && round2(value) > storeCreditLeft) {
      setLocalError(t('The customer has {amount} of store credit', { amount: money(storeCreditLeft) }));
      return;
    }
    if (isGiftCard(selected)) {
      if (!giftCard) {
        setLocalError(t('Scan or type the gift card code, then check its balance'));
        return;
      }
      if (round2(value) > giftCardLeft) {
        setLocalError(t('The gift card has {amount} left', { amount: money(giftCardLeft) }));
        return;
      }
    }
    if (selected.requiresReference && !isIntegrated(selected, online) && !reference.trim()) {
      setLocalError(t('{method} needs a reference (e.g. approval code)', { method: text(selected.name) }));
      return;
    }
    const tendered = round2(value);
    setPayments([
      ...payments,
      foreign
        ? {
            paymentMethodId: selected.id,
            amount: round2(toSaleCurrency(tendered, activeRate)),
            reference: reference.trim() || undefined,
            currencyCode: activeCurrency,
            tenderedAmount: tendered,
            exchangeRate: activeRate,
          }
        : {
            paymentMethodId: selected.id,
            amount: tendered,
            reference: reference.trim() || undefined,
            ...(isGiftCard(selected) && giftCard ? { giftCardCode: giftCard.code } : {}),
          },
    ]);
    setMethodId(null);
    setAmount('');
    setReference('');
    setLocalError(null);
  };

  const canComplete = remaining === 0 && change <= round2(cashPaid) + 0.005 && !submitting;
  const changeRate = rateOf(changeCurrency);
  const changeShown =
    changeCurrency === currency ? money(change) : money(changeIn(exactPaid - amountDue, changeRate), changeCurrency);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Payment')}</DialogTitle>
          <DialogDescription>
            {online ? t('Take one or more payments.') : (
              <span className="flex items-center gap-1 text-amber-700">
                <WifiOff className="h-4 w-4" /> {t('Offline — the sale will be saved on this device and uploaded later.')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center">
          <Stat
            label={t('Total')}
            value={money(amountDue)}
            others={currencies.slice(1).map((c) => money(amountDueIn(amountDue, rateOf(c)), c))}
          />
          <Stat label={t('Received|money')} value={money(paid)} />
          {change > 0 ? (
            <Stat label={t('Change|money')} value={changeShown} highlight />
          ) : (
            <Stat
              label={t('Remaining')}
              value={money(remaining)}
              highlight={remaining > 0}
              others={remaining > 0 ? currencies.slice(1).map((c) => money(amountDueIn(exactRemaining, rateOf(c)), c)) : []}
            />
          )}
        </div>

        {currencies.length > 1 && (
          <p className="text-center text-xs text-gray-500">
            {currencies
              .slice(1)
              .map((c) => `1 ${currency} = ${rateOf(c).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${c}`)
              .join(' · ')}
          </p>
        )}

        <ErrorMessage>{localError ?? error}</ErrorMessage>

        {payments.length > 0 && (
          <div className="divide-y rounded-md border text-sm">
            {payments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-2">
                <span>
                  {text(methods.get(payment.paymentMethodId)?.name)}
                  {payment.reference && <span className="text-gray-500"> · {payment.reference}</span>}
                  {payment.giftCardCode && (
                    <span className="text-gray-500"> · ****{payment.giftCardCode.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase()}</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-right">
                  {payment.currencyCode ? (
                    <span>
                      {money(payment.tenderedAmount!, payment.currencyCode)}
                      <span className="block text-xs text-gray-500">= {money(payment.amount)}</span>
                    </span>
                  ) : (
                    money(payment.amount)
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 max-sm:h-10 max-sm:w-10"
                    onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                    disabled={submitting}
                    aria-label={t('Remove payment')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}

        {remaining > 0 && (
          <>
            {currencies.length > 1 && (
              <CurrencyToggle
                label={t('Customer pays in')}
                currencies={currencies}
                value={tenderCurrency}
                onChange={selectCurrency}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              {visibleMethods.map((method) => {
                const blocked = specialBlocked(method);
                return (
                  <button
                    key={method.id}
                    onClick={() => selectMethod(method.id)}
                    disabled={!!blocked}
                    aria-pressed={methodId === method.id}
                    className={cn(
                      'flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
                      methodId === method.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {isPoints(method) ? (
                      <Gift className="h-5 w-5" />
                    ) : isGiftCard(method) ? (
                      <Ticket className="h-5 w-5" />
                    ) : isStoreCredit(method) ? (
                      <Wallet className="h-5 w-5" />
                    ) : isOnAccount(method) ? (
                      <BookOpen className="h-5 w-5" />
                    ) : method.methodType === 'cash' ? (
                      <Banknote className="h-5 w-5" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    <span>
                      {text(method.name, method.code)}
                      {isPoints(method) && loyalty && (
                        <span className="block text-xs font-normal text-gray-500">
                          {t('{points} pts', { points: Math.max(0, loyalty.points - pointsUsed) })}
                          {' = '}
                          {money(loyaltyMath.valueOf(loyalty.rules, Math.max(0, loyalty.points - pointsUsed)))}
                          {blocked && ` · ${blocked}`}
                        </span>
                      )}
                      {isStoreCredit(method) && (
                        <span className="block text-xs font-normal text-gray-500">
                          {t('{amount} available', { amount: money(storeCreditLeft) })}
                          {blocked && ` · ${blocked}`}
                        </span>
                      )}
                      {(isOnAccount(method) || isGiftCard(method)) && blocked && (
                        <span className="block text-xs font-normal text-gray-500">{blocked}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addPayment();
                }}
              >
                {isGiftCard(selected) && (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={giftCode}
                      onChange={(e) => {
                        setGiftCode(e.target.value);
                        setGiftCard(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          checkGiftCard();
                        }
                      }}
                      placeholder={t('Gift card code')}
                      aria-label={t('Gift card code')}
                      autoComplete="off"
                      className="flex-1 font-mono uppercase"
                    />
                    <Button type="button" variant="outline" onClick={checkGiftCard} disabled={checkingGift || !giftCode.trim()}>
                      {checkingGift ? t('Checking...') : t('Check balance')}
                    </Button>
                  </div>
                )}
                {isGiftCard(selected) && giftCard && (
                  <p className="text-xs text-gray-600">
                    {t('Gift card ending {last4}: {amount} available', {
                      last4: giftCard.last4 ?? '',
                      amount: money(giftCardLeft),
                    })}
                  </p>
                )}
                {isOnAccount(selected) && customer && (
                  <p className="text-xs text-gray-600">
                    {t("Charged to {name}'s account. A manager may need to approve it at checkout.", { name: customer.name })}
                  </p>
                )}
                {selected.methodType === 'cash' && (
                  <div className="flex flex-wrap gap-2">
                    {cashSuggestions(dueInActive, activeRate).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="max-sm:h-11 max-sm:flex-auto max-sm:text-sm"
                        onClick={() => addPayment(value)}
                      >
                        {money(value, activeCurrency)}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      autoFocus={!isGiftCard(selected)}
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      aria-label={t('Amount in {currency}', { currency: activeCurrency })}
                      enterKeyHint="done"
                      className="pr-14 text-right text-lg max-sm:h-11"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {activeCurrency}
                    </span>
                  </div>
                  {selected.requiresReference && !isIntegrated(selected, online) && (
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={t('Reference')}
                      aria-label={t('Reference')}
                      className="flex-1"
                    />
                  )}
                  <Button type="submit" variant="outline" className="max-sm:h-11 max-sm:px-5">
                    {t('Add')}
                  </Button>
                </div>
                {foreign && Number(amount) > 0 && (
                  <p className="text-xs text-gray-500">
                    {t('= {amount} at {rate} {from}/{to}', {
                      amount: money(round2(toSaleCurrency(Number(amount), activeRate))),
                      rate: activeRate.toLocaleString(undefined, { maximumFractionDigits: 4 }),
                      from: activeCurrency,
                      to: currency,
                    })}
                  </p>
                )}
                {isIntegrated(selected, online) && (
                  <p className="text-xs text-gray-500">
                    {t('The card terminal is charged when you complete the sale.')}
                  </p>
                )}
              </form>
            )}
          </>
        )}

        {change > 0 && (
          <div className="rounded-lg border-2 border-green-600 bg-green-50 p-3" role="status">
            <div className="mb-2 text-sm font-semibold uppercase text-green-900">
              {t('Give back to the customer')}
              {currencies.length > 1 && <span className="font-normal normal-case"> · {t('tap the currency you hand back')}</span>}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currencies.length}, minmax(0, 1fr))` }}>
              {currencies.map((c) => {
                const value = c === currency ? money(change) : money(changeIn(exactPaid - amountDue, rateOf(c)), c);
                const chosen = changeCurrency === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChangeCurrency(c)}
                    aria-pressed={chosen}
                    disabled={currencies.length === 1}
                    className={cn(
                      'rounded-md border-2 px-2 py-2 text-center',
                      chosen ? 'border-green-700 bg-white text-green-900 shadow-sm' : 'border-transparent text-green-800/70 hover:bg-white/60'
                    )}
                  >
                    <span className="block text-xs font-medium">{c}</span>
                    <span className={cn('block font-bold tabular-nums break-words', chosen ? 'text-2xl max-sm:text-xl' : 'text-lg')}>
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={dialogStickyFooter}>
          <Button
            size="lg"
            className="w-full max-sm:h-auto max-sm:min-h-12 max-sm:whitespace-normal max-sm:py-2 max-sm:text-base"
            disabled={!canComplete}
            onClick={() => onComplete(payments, change > 0 && changeCurrency !== currency ? changeCurrency : undefined)}
          >
            {submitting
              ? t('Completing sale...')
              : change > 0
                ? t('Complete sale · give {amount} change', { amount: changeShown })
                : t('Complete sale')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CurrencyToggle({
  label,
  currencies,
  value,
  onChange,
  detail,
}: {
  label: string;
  currencies: string[];
  value: string;
  onChange: (code: string) => void;
  detail?: (code: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex flex-1 gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label={label}>
        {currencies.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={value === code}
            onClick={() => onChange(code)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium max-sm:py-2.5',
              value === code ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {code}
            {detail && <span className="block text-xs font-normal text-gray-500">{detail(code)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight, others = [] }: { label: string; value: string; highlight?: boolean; others?: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={cn('text-lg font-semibold break-words max-sm:text-base', highlight && 'text-blue-700')}>{value}</div>
      {others.map((o) => (
        <div key={o} className="text-xs text-gray-500">{`≈ ${o}`}</div>
      ))}
    </div>
  );
}
