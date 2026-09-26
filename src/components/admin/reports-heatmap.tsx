'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

type Row = Record<string, string | number | null>;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Sales by weekday × hour (sales-by-hour report) as a heatmap, one currency at a
 * time: darker cells had more sales.
 */
export function SalesHeatmap({ rows, defaultCurrency }: { rows: Row[]; defaultCurrency: string }) {
  const currencies = [...new Set(rows.map((r) => String(r.currency ?? '')))].filter(Boolean);
  const [chosen, setChosen] = useState<string | null>(null);
  const currency =
    chosen && currencies.includes(chosen)
      ? chosen
      : currencies.includes(defaultCurrency)
        ? defaultCurrency
        : currencies[0];
  if (!currency) return null;

  const cells = new Map<string, Row>();
  rows
    .filter((r) => r.currency === currency)
    .forEach((r) => cells.set(`${Number(r.weekday)}-${Number(r.hour)}`, r));
  const max = Math.max(1, ...[...cells.values()].map((r) => Number(r.saleCount ?? 0)));

  return (
    <div className="space-y-2 border-b p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('Busiest hours')}</h3>
        {currencies.length > 1 && (
          <Select
            value={currency}
            onChange={(e) => setChosen(e.target.value)}
            className="h-8 w-24 text-xs"
            aria-label={t('Currency')}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr>
              <th />
              {HOURS.map((h) => (
                <th key={h} className="w-6 font-normal text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day, index) => (
              <tr key={day}>
                <th className="pr-2 text-right font-normal text-gray-500">{t(day)}</th>
                {HOURS.map((hour) => {
                  const cell = cells.get(`${index + 1}-${hour}`);
                  const count = Number(cell?.saleCount ?? 0);
                  const title = cell
                    ? t('{day} {hour}:00 — {count} sale(s), {amount}', {
                        day: t(day),
                        hour,
                        count,
                        amount: formatMoney(Number(cell.netSales ?? 0), currency),
                      })
                    : undefined;
                  return (
                    <td
                      key={hour}
                      title={title}
                      className="h-5 w-6 rounded-sm"
                      style={{
                        backgroundColor: count > 0 ? `rgba(37, 99, 235, ${0.12 + (0.88 * count) / max})` : '#f3f4f6',
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
