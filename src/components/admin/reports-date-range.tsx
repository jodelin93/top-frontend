'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/i18n';

// Date ranges are kept as local calendar dates (YYYY-MM-DD, as used by <input type="date">)
// and only converted to ISO timestamps when calling the API. '' means open-ended.

export type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'all' | 'custom';

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
}

const presetLabels: Record<RangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  month: 'This month',
  all: 'All time',
  custom: 'Custom range',
};

export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' → local midnight (new Date('YYYY-MM-DD') would be UTC midnight)
export function parseDateInput(value: string, dayOffset = 0): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day + dayOffset);
}

export const startOfDayIso = (value: string) => parseDateInput(value).toISOString();

// Last millisecond of the local day
export const endOfDayIso = (value: string) =>
  new Date(parseDateInput(value, 1).getTime() - 1).toISOString();

export function presetRange(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const now = new Date();
  const today = toDateInput(now);
  const daysAgo = (n: number) => toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));

  switch (preset) {
    case 'today':
      return { preset, from: today, to: today };
    case 'yesterday':
      return { preset, from: daysAgo(1), to: daysAgo(1) };
    case '7d':
      return { preset, from: daysAgo(6), to: today };
    case '30d':
      return { preset, from: daysAgo(29), to: today };
    case 'month':
      return { preset, from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case 'all':
      return { preset, from: '', to: '' };
  }
}

// Every calendar day from → to (inclusive), as YYYY-MM-DD
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const end = toDateInput(parseDateInput(to));
  for (let i = 0; i < 1000; i++) {
    const day = toDateInput(parseDateInput(from, i));
    if (day > end) break;
    days.push(day);
  }
  return days;
}

export function DateRangeFilter({
  value,
  onChange,
  presets,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets: Exclude<RangePreset, 'custom'>[];
}) {
  const handlePreset = (preset: RangePreset) => {
    if (preset === 'custom') onChange({ ...value, preset });
    else onChange(presetRange(preset));
  };

  // Editing a date switches to a custom range; keep from ≤ to
  const handleFrom = (from: string) =>
    onChange({ preset: 'custom', from, to: value.to && from > value.to ? from : value.to });
  const handleTo = (to: string) =>
    onChange({ preset: 'custom', from: value.from && to && to < value.from ? to : value.from, to });

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Select
        value={value.preset}
        onChange={(e) => handlePreset(e.target.value as RangePreset)}
        className="sm:w-40"
        aria-label={t('Date range')}
      >
        {[...presets, 'custom' as const].map((preset) => (
          <option key={preset} value={preset}>
            {t(presetLabels[preset])}
          </option>
        ))}
      </Select>
      <div className="flex min-w-0 items-center gap-2">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => handleFrom(e.target.value)}
          className="min-w-0 flex-1 max-sm:px-2 sm:w-40 sm:flex-none"
          aria-label={t('From date')}
        />
        <span className="text-sm text-gray-400">{t('to')}</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => handleTo(e.target.value)}
          className="min-w-0 flex-1 max-sm:px-2 sm:w-40 sm:flex-none"
          aria-label={t('To date')}
        />
      </div>
    </div>
  );
}
