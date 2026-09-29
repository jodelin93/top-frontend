import type { Lang } from '@/i18n';
import type { HelpIndex, HelpTopic } from './types';

/**
 * Help indexes are split per language and loaded on demand (the first time help opens),
 * so the till does not download the manual in four languages up front.
 */
const loaders: Record<Lang, () => Promise<HelpIndex>> = {
  en: () => import('./generated/index.en.json').then((m) => m.default as HelpIndex),
  fr: () => import('./generated/index.fr.json').then((m) => m.default as HelpIndex),
  ht: () => import('./generated/index.ht.json').then((m) => m.default as HelpIndex),
  es: () => import('./generated/index.es.json').then((m) => m.default as HelpIndex),
};

/** Languages a missing topic falls back to, in order */
export const FALLBACK_LANGS: Lang[] = ['en', 'fr'];

const cache = new Map<Lang, Promise<HelpIndex>>();
const raw = (lang: Lang) => {
  let promise = cache.get(lang);
  if (!promise) {
    promise = loaders[lang]().catch((error) => {
      cache.delete(lang);
      throw error;
    });
    cache.set(lang, promise);
  }
  return promise;
};

/**
 * Topics of a language, completed with the English (then French) topic for any topic
 * not yet translated. Each topic carries the language it is written in.
 */
export function mergeWithFallback(lang: string, indexes: HelpIndex[]): HelpIndex {
  const seen = new Set<string>();
  const topics: HelpTopic[] = [];
  for (const index of indexes) {
    for (const topic of index.topics) {
      if (seen.has(topic.id)) continue;
      seen.add(topic.id);
      topics.push({ ...topic, lang: index.lang });
    }
  }
  topics.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { lang, topics };
}

const merged = new Map<Lang, Promise<HelpIndex>>();

export function loadHelpIndex(lang: Lang): Promise<HelpIndex> {
  let promise = merged.get(lang);
  if (!promise) {
    const order = [lang, ...FALLBACK_LANGS.filter((l) => l !== lang)];
    promise = Promise.all(order.map(raw)).then((indexes) => mergeWithFallback(lang, indexes));
    promise.catch(() => merged.delete(lang));
    merged.set(lang, promise);
  }
  return promise;
}

/** URL of a screenshot in a language */
export const shotUrl = (lang: string, shot: string) => `/help/shots/${lang}/${shot}.webp`;

/** The whole manual of a language as a PDF (built by scripts/help-pdf.mjs) */
export const manualPdfUrl = (lang: string) => `/help/pdf/joda-pos-manual-${lang}.pdf`;
