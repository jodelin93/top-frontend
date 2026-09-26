/**
 * Translations (English, French, Haitian Creole, Spanish).
 *
 * The English text itself is the key: `t('Save')` returns "Enregistrer" in French and
 * "Save" in English (or when a translation is missing). Placeholders use braces:
 * `t('Page {page} of {total}', { page: 2, total: 5 })`.
 *
 * Language = the user's own choice (kept on this device), else the store default
 * (Settings → General), else English. Changing it re-renders the whole app, so `t()`
 * can be called anywhere during render; never at module level (it would be frozen in
 * the language active when the file loaded).
 *
 * Context: when one English word needs different French depending on where it is used,
 * add the context after a bar: t('Change|money') shows "Change" in English and uses the
 * 'Change|money' entry in French.
 *
 * Texts live in ./<lang>/*.ts (fr, ht, es), one file per area of the app. A text missing
 * in a language falls back to English.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { es } from './es';
import { fr } from './fr';
import { ht } from './ht';

export type Lang = 'en' | 'fr' | 'ht' | 'es';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ht', label: 'Kreyòl ayisyen' },
  { code: 'es', label: 'Español' },
];

export const isLang = (value: unknown): value is Lang =>
  LANGUAGES.some((l) => l.code === value);

interface I18nState {
  // Chosen by the user on this device (null: follow the store default)
  personal: Lang | null;
  // Store default from the settings
  storeDefault: Lang | null;
  // Language the page was first rendered in (from the "lang" cookie)
  initial: Lang;
  setPersonal: (lang: Lang | null) => void;
  setStoreDefault: (lang: Lang | null) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      personal: null,
      storeDefault: null,
      initial: 'en',
      setPersonal: (personal) => set({ personal }),
      setStoreDefault: (storeDefault) => set({ storeDefault }),
    }),
    // Only the personal choice is kept; the store default comes from the server
    { name: 'language', partialize: (state) => ({ personal: state.personal }) }
  )
);

const effective = (state: Pick<I18nState, 'personal' | 'storeDefault' | 'initial'>): Lang =>
  state.personal ?? state.storeDefault ?? state.initial;

/** Active language, outside React */
export const currentLang = (): Lang => effective(useI18nStore.getState());

/** Active language, re-rendering when it changes */
export const useLang = (): Lang => useI18nStore(effective);

/** BCP 47 locale for number, money and date formatting */
// Haitian Creole uses Haiti's number and date conventions (as in French)
const LOCALES: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR', ht: 'fr-HT', es: 'es-419' };
export const currentLocale = (): string => LOCALES[currentLang()];

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, fr, ht, es };

export type TranslateVars = Record<string, string | number | null | undefined>;

// "Change|money": the same English word needing another translation in some context.
// The part after "|" only picks the translation; English shows the part before it.
const englishOf = (key: string) => {
  const bar = key.indexOf('|');
  return bar === -1 ? key : key.slice(0, bar);
};

/** Translate an English text into the active language */
export function t(text: string, vars?: TranslateVars): string {
  const lang = currentLang();
  const translated = lang === 'en' ? englishOf(text) : (dictionaries[lang][text] ?? englishOf(text));
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key] ?? '') : match
  );
}

/** Singular or plural text for a count: plural(n, '{count} sale', '{count} sales') */
export function plural(count: number, one: string, other: string, vars?: TranslateVars): string {
  // French and Haitian Creole treat 0 and 1 as singular; English and Spanish only 1
  const lang = currentLang();
  const singular = lang === 'fr' || lang === 'ht' ? Math.abs(count) < 2 : Math.abs(count) === 1;
  return t(singular ? one : other, { count, ...vars });
}
