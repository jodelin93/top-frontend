'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/admin/page-header';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { formatMoney } from '@/lib/format';
import { toSaleCurrency } from '@/lib/pos/currency-math';
import { t } from '@/i18n';

export interface CurrencyAmount {
  currencyCode: string;
  amount: string;
}

/** Currencies money can be entered in: the store's, then the accepted ones (e.g. HTG) */
export function useMoneyCurrencies(storeCurrency: string) {
  const { data: settings } = useStoreSettings();
  const rates = settings?.exchangeRates ?? {};
  const currencies = [storeCurrency, ...Object.keys(rates).filter((c) => c !== storeCurrency && Number(rates[c]) > 0)];
  return { currencies, rates };
}

/**
 * What to send for an amount typed in some currency: the store-currency value (HTG
 * valued at the sell rate) and, for another currency, that currency and the amount in it
 */
export function currencyAmountInput(
  value: CurrencyAmount,
  storeCurrency: string,
  rates: Record<string, number>
): { amount: number; currencyCode?: string; tenderedAmount?: number } {
  const typed = Math.round(Number(value.amount) * 100) / 100;
  const rate = Number(rates[value.currencyCode]);
  if (value.currencyCode === storeCurrency || !(rate > 0)) return { amount: typed };
  return {
    amount: Math.round(toSaleCurrency(typed, rate) * 100) / 100,
    currencyCode: value.currencyCode,
    tenderedAmount: typed,
  };
}

/**
 * An amount with its currency (USD or HTG...). Another currency shows what it is worth
 * in the store currency at the sell rate.
 */
export function CurrencyAmountField({
  id,
  label,
  storeCurrency,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  storeCurrency: string;
  value: CurrencyAmount;
  onChange: (value: CurrencyAmount) => void;
  hint?: string;
}) {
  const { currencies, rates } = useMoneyCurrencies(storeCurrency);
  const rate = Number(rates[value.currencyCode]);
  const foreign = value.currencyCode !== storeCurrency && rate > 0;
  const worth = foreign && Number(value.amount) > 0 ? toSaleCurrency(Number(value.amount), rate) : null;
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={
        worth !== null
          ? t('= {amount} at the sell rate ({rate})', { amount: formatMoney(worth, storeCurrency), rate })
          : hint
      }
    >
      <div className="flex gap-1">
        {currencies.length > 1 && (
          <Select
            aria-label={t('Currency')}
            value={value.currencyCode}
            onChange={(e) => onChange({ ...value, currencyCode: e.target.value })}
            className="w-24 shrink-0"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        )}
        <Input
          id={id}
          inputMode="decimal"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value.replace(/[^\d.]/g, '') })}
          className="min-w-0 flex-1"
        />
      </div>
    </Field>
  );
}
