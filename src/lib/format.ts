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

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(parseDateValue(value));
}

// Parse an optional number input: '' → undefined
export function toNumberOrUndefined(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}
