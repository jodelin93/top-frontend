'use client';

import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { countTotal, DenominationCount, shiftsApi } from '@/lib/api/shifts';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

// Fallback when the denominations can't be loaded (e.g. offline)
const FALLBACK = [100, 50, 20, 10, 5, 1, 0.25, 0.1, 0.05, 0.01];

export function useDenominations(currencyCode: string) {
  const { data } = useQuery({
    queryKey: ['shifts', 'denominations', currencyCode],
    queryFn: () => shiftsApi.denominations(currencyCode),
    staleTime: 10 * 60_000,
    retry: false,
  });
  return data?.denominations ?? FALLBACK;
}

/** Quantities keyed by face value, as typed by the cashier */
export type CountState = Record<string, string>;

export function countsFromState(denominations: number[], state: CountState): DenominationCount[] {
  return denominations
    .map((value) => ({
      value,
      quantity: Number.parseInt(state[String(value)] ?? '', 10) || 0,
    }))
    .filter((c) => c.quantity > 0);
}

/**
 * Count the drawer note by note and coin by coin, with a running total
 */
export function DenominationCountForm({
  denominations,
  value,
  onChange,
  currency,
}: {
  denominations: number[];
  value: CountState;
  onChange: (value: CountState) => void;
  currency: string;
}) {
  const total = countTotal(countsFromState(denominations, value));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {denominations.map((d) => {
          const key = String(d);
          const quantity = Number.parseInt(value[key] ?? '', 10) || 0;
          return (
            <label key={key} className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-right font-medium tabular-nums">{formatMoney(d, currency)}</span>
              <span className="text-gray-400">×</span>
              <Input
                inputMode="numeric"
                aria-label={t('Number of {value}', { value: formatMoney(d, currency) })}
                className="h-8 w-16 px-2 text-right"
                value={value[key] ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [key]: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
                onFocus={(e) => e.target.select()}
              />
              <span className="ml-auto text-xs tabular-nums text-gray-500">
                {quantity > 0 ? formatMoney(d * quantity, currency) : ''}
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
        <span>{t('Counted total')}</span>
        <span className="tabular-nums" data-testid="count-total">
          {formatMoney(total, currency)}
        </span>
      </div>
    </div>
  );
}
