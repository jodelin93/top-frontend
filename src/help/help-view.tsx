'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Search, X } from 'lucide-react';
import { LANGUAGES, t, useLang, type Lang } from '@/i18n';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { loadHelpIndex } from './load';
import { MarkdownView } from './markdown-view';
import { topicsForRoute } from './routes';
import { highlight as highlightTitle, searchTopics, type HighlightPart } from './search';
import type { HelpIndex, HelpTopic } from './types';

/** The help index of the current language (with fallbacks), loaded on first use */
export function useHelpIndex(): { index: HelpIndex | null; error: boolean } {
  const lang = useLang();
  const [state, setState] = useState<{ lang: Lang; index: HelpIndex | null; error: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    loadHelpIndex(lang).then(
      (index) => alive && setState({ lang, index, error: false }),
      () => alive && setState({ lang, index: null, error: true })
    );
    return () => {
      alive = false;
    };
  }, [lang]);
  if (!state || state.lang !== lang) return { index: null, error: false };
  return { index: state.index, error: state.error };
}

/** Topics the current user may read: everything once signed in, else the public ones */
export function useVisibleTopics(index: HelpIndex | null): HelpTopic[] {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  return useMemo(
    () => (index ? index.topics.filter((topic) => signedIn || topic.public) : []),
    [index, signedIn]
  );
}

interface HelpViewProps {
  topicId: string | null;
  query: string;
  onQuery: (query: string) => void;
  onOpenTopic: (topicId: string | null) => void;
  /** Back button in a topic (default: to the help home) */
  onBack?: () => void;
  /** A link left the help for an app page */
  onLeave?: () => void;
  /** Location the help was opened from: its topics are suggested on the home */
  location?: { pathname: string; search: string } | null;
  /** Focus the search box when shown */
  autoFocusSearch?: boolean;
  className?: string;
}

/** Search, categories and topic reader: the body of the help drawer and of /help */
export function HelpView({
  topicId,
  query,
  onQuery,
  onOpenTopic,
  onBack,
  onLeave,
  location,
  autoFocusSearch,
  className,
}: HelpViewProps) {
  const lang = useLang();
  const { index, error } = useHelpIndex();
  const topics = useVisibleTopics(index);
  const scrollRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics]);
  const topic = topicId ? byId.get(topicId) ?? null : null;
  const results = useMemo(() => (query.trim() ? searchTopics(topics, query) : null), [topics, query]);

  // Each topic starts at the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [topicId, results === null]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="border-b bg-white px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={query}
            autoFocus={autoFocusSearch}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t('Search the help...')}
            aria-label={t('Search the help')}
            className="h-11 w-full rounded-md border border-gray-300 bg-white pl-9 pr-9 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:h-10 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              aria-label={t('Clear the search')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {error ? (
          <p className="text-sm text-red-700">{t('The help could not be loaded. Check the connection and try again.')}</p>
        ) : !index ? (
          <p className="text-sm text-gray-500">{t('Loading help...')}</p>
        ) : results ? (
          <SearchResults results={results} query={query} onOpenTopic={onOpenTopic} />
        ) : topic ? (
          <TopicView
            topic={topic}
            lang={lang}
            byId={byId}
            onOpenTopic={onOpenTopic}
            onBack={onBack ?? (() => onOpenTopic(null))}
            onLeave={onLeave}
          />
        ) : (
          <HelpHome
            topics={topics}
            location={location}
            missing={topicId !== null}
            onOpenTopic={onOpenTopic}
          />
        )}
      </div>
    </div>
  );
}

function Highlighted({ parts }: { parts: HighlightPart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

function SearchResults({
  results,
  query,
  onOpenTopic,
}: {
  results: ReturnType<typeof searchTopics>;
  query: string;
  onOpenTopic: (id: string) => void;
}) {
  if (!results.length) {
    return (
      <div className="space-y-2 text-sm text-gray-600">
        <p>{t('No help topic matches “{query}”.', { query: query.trim() })}</p>
        <p>{t('Try another word, or browse the topics by category.')}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500" aria-live="polite">
        {results.length === 1 ? t('1 topic found') : t('{count} topics found', { count: results.length })}
      </p>
      <ul className="space-y-2">
        {results.map(({ topic, matched, snippet }) => (
          <li key={topic.id}>
            <button
              type="button"
              onClick={() => onOpenTopic(topic.id)}
              className="w-full rounded-md border bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{topic.category}</div>
              <div className="font-semibold text-gray-900">
                <Highlighted parts={highlightTitle(topic.title, matched)} />
              </div>
              <div className="mt-1 line-clamp-3 text-sm text-gray-600">
                <Highlighted parts={snippet} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicLink({ topic, onOpenTopic }: { topic: HelpTopic; onOpenTopic: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenTopic(topic.id)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 md:py-1.5"
    >
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
      <span className="min-w-0 flex-1">{topic.title}</span>
    </button>
  );
}

function HelpHome({
  topics,
  location,
  missing,
  onOpenTopic,
}: {
  topics: HelpTopic[];
  location?: { pathname: string; search: string } | null;
  missing: boolean;
  onOpenTopic: (id: string) => void;
}) {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const suggested = location ? topicsForRoute(topics, location.pathname, location.search).slice(0, 5) : [];
  const categories = useMemo(() => {
    const map = new Map<string, HelpTopic[]>();
    for (const topic of topics) {
      const list = map.get(topic.category) ?? [];
      list.push(topic);
      map.set(topic.category, list);
    }
    return [...map.entries()];
  }, [topics]);

  return (
    <div className="space-y-5">
      {missing && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{t('This help topic does not exist.')}</p>}
      {!signedIn && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">{t('Sign in to see all the help topics.')}</p>
      )}
      {suggested.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{t('For this page')}</h3>
          {suggested.map((topic) => (
            <TopicLink key={topic.id} topic={topic} onOpenTopic={onOpenTopic} />
          ))}
        </section>
      )}
      {categories.map(([category, list]) => (
        <section key={category}>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {category}
          </h3>
          {list.map((topic) => (
            <TopicLink key={topic.id} topic={topic} onOpenTopic={onOpenTopic} />
          ))}
        </section>
      ))}
    </div>
  );
}

function TopicView({
  topic,
  lang,
  byId,
  onOpenTopic,
  onBack,
  onLeave,
}: {
  topic: HelpTopic;
  lang: Lang;
  byId: Map<string, HelpTopic>;
  onOpenTopic: (id: string | null) => void;
  onBack: () => void;
  onLeave?: () => void;
}) {
  const related = topic.related.map((id) => byId.get(id)).filter((r): r is HelpTopic => !!r);
  const topicLang = topic.lang ?? lang;
  const shownIn = LANGUAGES.find((l) => l.code === topicLang)?.label ?? topicLang;
  return (
    <article lang={topicLang}>
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 mb-2 flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('Back')}
      </button>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{topic.category}</div>
      <h2 className="mb-3 text-xl font-bold text-gray-900">{topic.title}</h2>
      {topicLang !== lang && (
        <p className="mb-3 rounded-md bg-gray-100 p-2 text-xs text-gray-600" lang={lang}>
          {t('This topic is not translated yet: it is shown in {language}.', { language: shownIn })}
        </p>
      )}
      <MarkdownView blocks={topic.blocks} lang={topicLang} onOpenTopic={onOpenTopic} onLeave={onLeave} />
      {related.length > 0 && (
        <section className="mt-6 border-t pt-4" lang={lang}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('Related topics')}</h3>
          {related.map((r) => (
            <TopicLink key={r.id} topic={r} onOpenTopic={onOpenTopic} />
          ))}
        </section>
      )}
    </article>
  );
}
