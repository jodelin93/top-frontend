'use client';

import type { ReportSummary } from '@/lib/api/reports';
import { formatMoney } from '@/lib/format';
import { currentLocale, plural, t } from '@/i18n';
import { eachDay, parseDateInput } from '@/components/admin/reports-date-range';

const MAX_LABELS = 10;

const dayLabel = (value: string) =>
  new Intl.DateTimeFormat(currentLocale(), { month: 'short', day: 'numeric' }).format(parseDateInput(value));

/**
 * Sales-by-day bar chart drawn with plain divs. Days without sales are filled with
 * zero so gaps in the range stay visible.
 */
export function SalesByDayChart({
  byDay,
  from,
  to,
  currency,
}: {
  byDay: ReportSummary['byDay'];
  // Local dates (YYYY-MM-DD) of the reported range
  from: string;
  to: string;
  currency: string;
}) {
  const totals = new Map(byDay.map((row) => [row.date, row]));
  const days = eachDay(from, to).map((date) => ({
    date,
    total: Number(totals.get(date)?.total ?? 0),
    saleCount: Number(totals.get(date)?.saleCount ?? 0),
  }));
  const max = Math.max(0, ...days.map((day) => day.total));

  if (max === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        {t('No sales in this period')}
      </div>
    );
  }

  // Label only every nth day on long ranges
  const labelEvery = Math.ceil(days.length / MAX_LABELS);

  return (
    <div>
      <div className="flex h-48 items-end gap-px border-b sm:gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${dayLabel(day.date)}: ${formatMoney(day.total, currency)} (${plural(
              day.saleCount,
              '{count} sale',
              '{count} sales'
            )})`}
            className="group flex h-full min-w-0 flex-1 items-end"
          >
            <div
              className="w-full rounded-t bg-blue-500 group-hover:bg-blue-700"
              style={{
                height: `${(day.total / max) * 100}%`,
                // Keep tiny non-zero days visible
                minHeight: day.total > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-px sm:gap-1">
        {days.map((day, index) => (
          <div key={day.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-gray-500">
            {index % labelEvery === 0 ? dayLabel(day.date) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
