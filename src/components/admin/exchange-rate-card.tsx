'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/admin/page-header';
import { settingsApi } from '@/lib/api/settings';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { givenRateName, isInvertedRate, quoteRate, quotedRate, rateFromQuoted, receivedRateName, type RateName } from '@/lib/pos/rate-quote';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

// Offered when adding a currency; any ISO code can be typed
const COMMON_CURRENCIES = ['HTG', 'USD', 'EUR', 'CAD', 'DOP'];

const rateLabel = (name: RateName) => (name === 'sell' ? t('Sell rate') : t('Buy rate'));

// A currency being edited: the two rates as they are written (132.5), and whether the
// store currency is the weaker one ("132.5 HTG = 1 USD") or not ("1 USD = 132.5 HTG")
interface RateRow {
  code: string;
  sell: string;
  buy: string;
  inverted: boolean;
}

/**
 * Exchange rates of the other currencies customers can pay with, written with the
 * store currency first: 1 USD = 132.50 HTG in a dollar store, 132.50 HTG = 1 USD in a
 * gourde store. Two rates per currency, named after the stronger currency: the SELL
 * rate turns the weaker currency into the stronger one (HTG → USD), the BUY rate the
 * stronger into the weaker (USD → HTG). Everyone sees the current rates; users with
 * settings.manage can change them. Each change is versioned and audited (Settings →
 * History).
 */
export function ExchangeRateCard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = hasPermission(user, 'settings.manage');
  const { data: settings } = useStoreSettings();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<RateRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const base = settings?.currencyCode ?? 'USD';
  const rates = settings?.exchangeRates ?? {};
  const buyRates = settings?.exchangeBuyRates ?? {};
  const entries = Object.entries(rates);
  const buyOf = (code: string, sell: number) => (Number(buyRates[code]) > 0 ? Number(buyRates[code]) : sell);

  const { data: history = [] } = useQuery({
    queryKey: ['settings', 'versions', 'rates'],
    queryFn: () => settingsApi.versions(100),
    enabled: canEdit,
    select: (versions) =>
      versions.filter(
        (v) =>
          (v.changedKeys.includes('exchangeRates') || v.changedKeys.includes('exchangeBuyRates')) &&
          v.status !== 'cancelled'
      ),
  });
  const lastChange = history[0];

  const save = useMutation({
    mutationFn: (input: { exchangeRates: Record<string, number>; exchangeBuyRates: Record<string, number> }) =>
      settingsApi.update({ ...input, note: t('Exchange rate update') }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'context'] });
      setEditing(false);
    },
  });

  // The two rates of a currency under their names: the kept rates are "that currency
  // coming in" and "that currency given out"
  const named = (code: string, received: number) => {
    const given = buyOf(code, received);
    return receivedRateName(received) === 'sell' ? { sell: received, buy: given } : { sell: given, buy: received };
  };

  // In a gourde store the other currencies are the stronger ones
  const emptyRow = (code = ''): RateRow => ({ code, sell: '', buy: '', inverted: base === 'HTG' });

  const startEditing = () => {
    setRows(
      entries.length
        ? entries.map(([code, rate]) => {
            const { sell, buy } = named(code, rate);
            return { code, sell: String(quotedRate(sell)), buy: String(quotedRate(buy)), inverted: isInvertedRate(rate) };
          })
        : [emptyRow(base === 'HTG' ? 'USD' : 'HTG')]
    );
    save.reset();
    setEditing(true);
  };

  const update = (index: number, changes: Partial<RateRow>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  const submit = () => {
    const exchangeRates: Record<string, number> = {};
    const exchangeBuyRates: Record<string, number> = {};
    for (const row of rows) {
      const code = row.code.trim().toUpperCase();
      if (!code && !row.sell && !row.buy) continue;
      // An empty rate means the same as the other one
      const sell = rateFromQuoted(Number(row.sell.trim() || row.buy), row.inverted);
      const buy = rateFromQuoted(Number(row.buy.trim() || row.sell), row.inverted);
      // Kept as: that currency coming in, and that currency given out
      exchangeRates[code] = row.inverted ? buy : sell;
      exchangeBuyRates[code] = row.inverted ? sell : buy;
    }
    save.mutate({ exchangeRates, exchangeBuyRates });
  };

  return (
    <Card className="bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-medium">{t('Exchange rates')}</div>
            <div className="text-xs text-gray-500">
              {t('Customers can pay in {currencies}', {
                currencies: [base, ...entries.map(([c]) => c)].join(` ${t('or')} `),
              })}
              {lastChange &&
                ` · ${
                  lastChange.actorName
                    ? t('updated {date} by {name}', {
                        date: formatDateTime(lastChange.appliedAt ?? lastChange.effectiveFrom),
                        name: lastChange.actorName,
                      })
                    : t('updated {date}', { date: formatDateTime(lastChange.appliedAt ?? lastChange.effectiveFrom) })
                }`}
            </div>
          </div>
        </div>
        {canEdit && !editing && (
          <div className="flex flex-wrap gap-1">
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory}>
                <History className="h-4 w-4" />
                {t('History')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4" />
              {entries.length ? t('Update rate') : t('Add a currency')}
            </Button>
          </div>
        )}
      </div>

      {!editing && (
        <div className="mt-3 flex flex-wrap gap-3">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('Only {currency} is accepted. Add a currency to take payments in it at the till.', { currency: base })}
            </p>
          ) : (
            entries.flatMap(([code, rate]) => {
              const { sell, buy } = named(code, rate);
              const received = t('{code} received → {base}', { code, base });
              const given = t('{base} → {code} given out', { code, base });
              return [
                <div key={`${code}-sell`} className="min-w-44 rounded-lg border bg-gray-50 px-4 py-2" data-testid="rate-sell">
                  <div className="text-xs font-semibold text-gray-500">{t('Sell rate')}</div>
                  <div className="text-2xl font-semibold tabular-nums">{quoteRate(base, code, sell)}</div>
                  <div className="text-xs text-gray-500">{receivedRateName(rate) === 'sell' ? received : given}</div>
                </div>,
                <div key={`${code}-buy`} className="min-w-44 rounded-lg border bg-gray-50 px-4 py-2" data-testid="rate-buy">
                  <div className="text-xs font-semibold text-gray-500">{t('Buy rate')}</div>
                  <div className="text-2xl font-semibold tabular-nums">{quoteRate(base, code, buy)}</div>
                  <div className="text-xs text-gray-500">{receivedRateName(rate) === 'buy' ? received : given}</div>
                </div>,
              ];
            })
          )}
        </div>
      )}

      {editing && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <ErrorMessage>{save.error ? getErrorMessage(save.error, 'Could not save the rates') : null}</ErrorMessage>
          {rows.map((row, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 text-sm" data-testid="rate-row">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-gray-600">{t('Sell rate')}</span>
                <span className="flex items-center gap-1">
                  {!row.inverted && <span className="whitespace-nowrap">1 {base} =</span>}
                  <Input
                    value={row.sell}
                    onChange={(e) => update(index, { sell: e.target.value })}
                    inputMode="decimal"
                    placeholder="132.50"
                    className="w-28 text-right"
                    aria-label={t('Sell rate for {code}', { code: row.code || t('currency') })}
                    autoFocus={index === 0}
                  />
                </span>
              </label>
              <label className="space-y-1">
                <span className="block text-xs font-medium text-gray-600">{t('Buy rate')}</span>
                <span className="flex items-center gap-1">
                  <Input
                    value={row.buy}
                    onChange={(e) => update(index, { buy: e.target.value })}
                    inputMode="decimal"
                    placeholder={row.sell || '130.00'}
                    className="w-28 text-right"
                    aria-label={t('Buy rate for {code}', { code: row.code || t('currency') })}
                  />
                  {row.inverted && <span className="whitespace-nowrap">{base} = 1</span>}
                </span>
              </label>
              <Input
                value={row.code}
                onChange={(e) => update(index, { code: e.target.value.toUpperCase().slice(0, 3) })}
                list="exchange-currencies"
                placeholder={base === 'HTG' ? 'USD' : 'HTG'}
                className="w-20 uppercase"
                aria-label={t('Currency code')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => update(index, { inverted: !row.inverted })}
                aria-label={t('Write this rate the other way round')}
                title={t('Write this rate the other way round')}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, i) => i !== index))} aria-label={t('Stop accepting this currency')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <datalist id="exchange-currencies">
            {COMMON_CURRENCIES.filter((c) => c !== base).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, emptyRow()])}>
              <Plus className="h-4 w-4" />
              {t('Another currency')}
            </Button>
            <span className="flex-1" />
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Save rates')}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {(() => {
              // Named after the stronger currency of the first line (USD next to HTG)
              const other = rows[0]?.code || (base === 'HTG' ? 'USD' : 'HTG');
              const [weak, strong] = (rows[0]?.inverted ?? base === 'HTG') ? [base, other] : [other, base];
              return t(
                'Sell rate: used when {weak} is turned into {strong}. Buy rate: used when {strong} is turned into {weak}. Leave one empty to use the same rate for both.',
                { weak, strong }
              );
            })()}
          </p>
          <p className="text-xs text-gray-500">
            {t('New sales use the new rate right away. Sales already made keep the rate they were paid at.')}
          </p>
        </form>
      )}

      {showHistory && !editing && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md border text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <tr>
                <th className="px-3 py-1.5">{t('When')}</th>
                <th className="px-3 py-1.5">{t('Rates')}</th>
                <th className="px-3 py-1.5">{t('By')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap px-3 py-1.5">{formatDateTime(v.appliedAt ?? v.effectiveFrom)}</td>
                  <td className="px-3 py-1.5 tabular-nums">
                    {[
                      ...Object.entries(v.changes.exchangeRates ?? {}).map(
                        ([c, r]) => `${rateLabel(receivedRateName(r))}: ${quoteRate(base, c, r)}`
                      ),
                      ...Object.entries(v.changes.exchangeBuyRates ?? {}).map(
                        ([c, r]) => `${rateLabel(givenRateName(r))}: ${quoteRate(base, c, r)}`
                      ),
                    ].join(' · ') || t('Only {currency}', { currency: base })}
                  </td>
                  <td className="px-3 py-1.5">{v.actorName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
