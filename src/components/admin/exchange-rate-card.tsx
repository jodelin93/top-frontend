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
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

// Offered when adding a currency; any ISO code can be typed
const COMMON_CURRENCIES = ['HTG', 'USD', 'EUR', 'CAD', 'DOP'];

const formatRate = (rate: number) => rate.toLocaleString(undefined, { maximumFractionDigits: 6 });

/**
 * Exchange rates of the other currencies customers can pay with, e.g. 1 USD = 132.50 HTG.
 * Everyone sees the current rates; users with settings.manage can change them. Each
 * change is versioned and audited (Settings → History).
 */
export function ExchangeRateCard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = hasPermission(user, 'settings.manage');
  const { data: settings } = useStoreSettings();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<{ code: string; rate: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const base = settings?.currencyCode ?? 'USD';
  const rates = settings?.exchangeRates ?? {};
  const entries = Object.entries(rates);

  const { data: history = [] } = useQuery({
    queryKey: ['settings', 'versions', 'rates'],
    queryFn: () => settingsApi.versions(100),
    enabled: canEdit,
    select: (versions) => versions.filter((v) => v.changedKeys.includes('exchangeRates') && v.status !== 'cancelled'),
  });
  const lastChange = history[0];

  const save = useMutation({
    mutationFn: (exchangeRates: Record<string, number>) =>
      settingsApi.update({ exchangeRates, note: t('Exchange rate update') }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'context'] });
      setEditing(false);
    },
  });

  const startEditing = () => {
    setRows(entries.length ? entries.map(([code, rate]) => ({ code, rate: String(rate) })) : [{ code: base === 'HTG' ? 'USD' : 'HTG', rate: '' }]);
    save.reset();
    setEditing(true);
  };

  const submit = () => {
    const next: Record<string, number> = {};
    for (const row of rows) {
      const code = row.code.trim().toUpperCase();
      if (!code && !row.rate) continue;
      next[code] = Number(row.rate);
    }
    save.mutate(next);
  };

  return (
    <Card className="bg-white p-4">
      <div className="flex items-start justify-between gap-3">
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
          <div className="flex gap-1">
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
            entries.map(([code, rate]) => (
              <div key={code} className="rounded-lg border bg-gray-50 px-4 py-2">
                <div className="text-2xl font-semibold tabular-nums">
                  1 {base} = {formatRate(rate)} {code}
                </div>
                <div className="text-xs text-gray-500">
                  1 {code} = {formatRate(1 / rate)} {base}
                </div>
              </div>
            ))
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
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap">1 {base} =</span>
              <Input
                value={row.rate}
                onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, rate: e.target.value } : r)))}
                inputMode="decimal"
                placeholder="132.50"
                className="w-32 text-right"
                aria-label={t('Rate for {code}', { code: row.code || t('currency') })}
                autoFocus={index === 0}
              />
              <Input
                value={row.code}
                onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, code: e.target.value.toUpperCase().slice(0, 3) } : r)))}
                list="exchange-currencies"
                placeholder="HTG"
                className="w-20 uppercase"
                aria-label={t('Currency code')}
              />
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, { code: '', rate: '' }])}>
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
            {t('New sales use the new rate right away. Sales already made keep the rate they were paid at.')}
          </p>
        </form>
      )}

      {showHistory && !editing && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md border text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
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
                    {Object.entries(v.changes.exchangeRates ?? {}).map(([c, r]) => `1 ${base} = ${formatRate(r)} ${c}`).join(' · ') || t('Only {currency}', { currency: base })}
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
