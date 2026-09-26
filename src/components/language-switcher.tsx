'use client';

import { Languages } from 'lucide-react';
import { LANGUAGES, t, useI18nStore, useLang, type Lang } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * The user's own language on this device (overrides the store default).
 * "compact" shows two small EN / FR buttons for tight headers.
 */
export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const lang = useLang();
  const setPersonal = useI18nStore((state) => state.setPersonal);

  if (compact) {
    return (
      <div className={cn('flex rounded-md border p-0.5', className)} role="radiogroup" aria-label={t('Language')}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            title={l.label}
            onClick={() => setPersonal(l.code)}
            className={cn(
              'rounded px-2 py-1 text-xs font-semibold uppercase',
              lang === l.code ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {l.code}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700', className)}>
      <Languages className="h-4 w-4" />
      <span className="sr-only">{t('Language')}</span>
      <select
        value={lang}
        onChange={(e) => setPersonal(e.target.value as Lang)}
        className="flex-1 rounded border-gray-300 bg-transparent text-sm"
        aria-label={t('Language')}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
