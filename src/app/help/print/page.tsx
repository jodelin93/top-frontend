'use client';

import { useMemo } from 'react';
import { LANGUAGES, t, useLang } from '@/i18n';
import { useHelpIndex, useVisibleTopics } from '@/help/help-view';
import { MarkdownView } from '@/help/markdown-view';
import type { HelpTopic } from '@/help/types';

const noop = () => {};

/**
 * The whole manual on one page, in the app language: cover, contents, then every topic by
 * category. scripts/help-pdf.mjs prints it to public/help/pdf/ (the "Download the PDF"
 * button); it can also be printed from the browser. `data-help-print-ready` marks the end
 * of loading.
 */
export default function HelpPrintPage() {
  const lang = useLang();
  const { index, error } = useHelpIndex();
  const topics = useVisibleTopics(index);
  const categories = useMemo(() => {
    const map = new Map<string, HelpTopic[]>();
    for (const topic of topics) map.set(topic.category, [...(map.get(topic.category) ?? []), topic]);
    return [...map.entries()];
  }, [topics]);
  const language = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  if (error) return <p className="p-6 text-red-700">{t('The help could not be loaded. Check the connection and try again.')}</p>;
  if (!index) return <p className="p-6 text-gray-500">{t('Loading help...')}</p>;

  return (
    <div className="help-print mx-auto max-w-3xl bg-white px-6 py-8 text-gray-900" data-help-print-ready="">
      <style>{`
        @page { size: A4; margin: 16mm 14mm; }
        /* The receipt print styles (globals.css) hide everything else when printing */
        @media print { body { background: #fff; } .help-print, .help-print * { visibility: visible; } }
        .help-print-category { break-before: page; }
        .help-print-topic h2, .help-print-topic h3, .help-print-topic h4 { break-after: avoid; }
        .help-print-figure, .help-print-topic li, .help-print-topic table { break-inside: avoid; }
        .help-print-figure img { max-height: 120mm; width: auto; max-width: 100%; }
      `}</style>

      <header className="flex min-h-[70vh] flex-col justify-center border-b pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Joda POS</p>
        <h1 className="mt-2 text-4xl font-bold">{t('User manual')}</h1>
        <p className="mt-3 text-lg text-gray-600">{language}</p>
      </header>

      <nav className="help-print-category">
        <h2 className="mb-4 text-2xl font-bold">{t('Contents')}</h2>
        {categories.map(([category, list]) => (
          <section key={category} className="mb-3 break-inside-avoid">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{category}</h3>
            <ul className="mt-1 space-y-0.5 text-sm">
              {list.map((topic) => (
                <li key={topic.id}>
                  <a href={`#topic-${topic.id}`} className="text-blue-700">
                    {topic.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {categories.map(([category, list]) => (
        <section key={category} className="help-print-category">
          <h2 className="mb-6 border-b-2 border-blue-600 pb-2 text-3xl font-bold">{category}</h2>
          {list.map((topic) => (
            <article key={topic.id} id={`topic-${topic.id}`} lang={topic.lang ?? lang} className="help-print-topic mb-10">
              <h2 className="mb-3 text-2xl font-bold">{topic.title}</h2>
              <MarkdownView blocks={topic.blocks} lang={topic.lang ?? lang} onOpenTopic={noop} print />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
