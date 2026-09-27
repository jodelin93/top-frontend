// Display helpers shared by the POS and admin pages (formatted for the active language)
import { currentLocale } from '@/i18n';

export function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

// A calendar date without a time ("2026-09-25", a due date, a birthday) is that
// day wherever the viewer is; new Date() would read it as UTC midnight, which is
// the day before in Haiti (UTC−5).
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) return value;
  const day = DATE_ONLY.exec(value);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
}

/**
 * Calendar date of a moment in the device's time zone (YYYY-MM-DD, as used by
 * <input type="date">). toISOString().slice(0, 10) would give the UTC date: the
 * next day in Haiti from 7–8 pm.
 */
export function localIsoDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today in the device's (the store's) time zone */
export function todayLocalIso(): string {
  return localIsoDate(new Date());
}

/** Today plus a number of days, as YYYY-MM-DD (local calendar) */
export function addDaysLocalIso(days: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return localIsoDate(date);
}

/** Now as a value for <input type="datetime-local"> (local time, minutes) */
export function nowLocalInput(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${localIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(parseDateValue(value));
}

// Parse an optional number input: '' → undefined
export function toNumberOrUndefined(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}
