import type { HelpTopic } from './types';

/**
 * Help search: accent-insensitive (é = e), case-insensitive, tolerant to small typos,
 * ranked title > keywords > headings > body. Runs in the browser over the loaded index.
 */

const DIACRITICS = /[̀-ͯ]/g;

/** Lower case without accents: "Ouvrir la séance" → "ouvrir la seance" */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’`]/g, "'");
}

/**
 * Normalized text plus, for each normalized character, its index in the original text
 * (to highlight matches in the original).
 */
export function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = normalize(text[i]);
    for (let k = 0; k < n.length; k++) {
      norm += n[k];
      map.push(i);
    }
  }
  return { norm, map };
}

const WORD = /[a-z0-9]+/g;
export const words = (text: string): string[] => normalize(text).match(WORD) ?? [];

// Too common to rank on
const STOP_WORDS = new Set(
  (
    'a au aux avec ce ces dans de des du en et il la le les leur ou par pas pour qu que qui sa se ses son sur un une ' +
    'the an and or of to in on for with is it how do i my can what ' +
    'yon nan ak pou ki se li mwen ou ' +
    'el los las del con por para que como mi un una y o'
  ).split(' ')
);

/** Levenshtein distance, stopping early once above max */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (term: string) => (term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0);

/**
 * How well one query term matches a set of words: 1 exact, 0.8 prefix ("encais" →
 * "encaisser"), 0.5 one or two typos, 0 none.
 */
function termMatch(term: string, fieldWords: string[]): { score: number; word?: string } {
  let best = 0;
  let bestWord: string | undefined;
  const typos = allowedTypos(term);
  for (const word of fieldWords) {
    let score = 0;
    if (word === term) score = 1;
    else if (term.length >= 2 && word.startsWith(term)) score = 0.8;
    else if (term.length >= 5 && term.startsWith(word) && word.length >= term.length - 2) score = 0.6;
    else if (typos && editDistance(term, word, typos) <= typos) score = 0.5;
    if (score > best) {
      best = score;
      bestWord = word;
      if (score === 1) break;
    }
  }
  return { score: best, word: bestWord };
}

interface TopicFields {
  title: string[];
  keywords: string[];
  headings: string[];
  body: string[];
}

const fieldCache = new WeakMap<HelpTopic, TopicFields>();
const unique = (list: string[]) => [...new Set(list)];

function fieldsOf(topic: HelpTopic): TopicFields {
  let fields = fieldCache.get(topic);
  if (!fields) {
    fields = {
      title: unique(words(topic.title)),
      keywords: unique(topic.keywords.flatMap(words)),
      headings: unique(topic.headings.flatMap(words)),
      body: unique(words(topic.text)),
    };
    fieldCache.set(topic, fields);
  }
  return fields;
}

const WEIGHTS: Record<keyof TopicFields, number> = { title: 10, keywords: 6, headings: 4, body: 1 };

export interface SearchResult {
  topic: HelpTopic;
  score: number;
  /** Words of the topic that matched (normalized), for highlighting */
  matched: string[];
  snippet: HighlightPart[];
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/** Query terms (normalized, without stop words unless the query is only stop words) */
export function queryTerms(query: string): string[] {
  const all = unique(words(query));
  const meaningful = all.filter((w) => !STOP_WORDS.has(w));
  return meaningful.length ? meaningful : all;
}

export function searchTopics(topics: HelpTopic[], query: string, limit = 30): SearchResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const phrase = normalize(query.trim());
  const results: SearchResult[] = [];
  for (const topic of topics) {
    const fields = fieldsOf(topic);
    let score = 0;
    let found = 0;
    const matched: string[] = [];
    for (const term of terms) {
      let termScore = 0;
      for (const key of Object.keys(WEIGHTS) as (keyof TopicFields)[]) {
        const m = termMatch(term, fields[key]);
        if (m.score > 0) {
          termScore += m.score * WEIGHTS[key];
          if (m.word) matched.push(m.word);
        }
      }
      if (termScore > 0) found += 1;
      score += termScore;
    }
    if (found === 0) continue;
    // Every word of the query found ranks far above partial matches
    score *= found === terms.length ? 1 : 0.3 * (found / terms.length);
    // Whole phrase in the title or text
    if (terms.length > 1 && normalize(topic.title).includes(phrase)) score += 15;
    else if (terms.length > 1 && normalize(topic.text).includes(phrase)) score += 4;
    results.push({ topic, score, matched: unique(matched), snippet: [] });
  }
  results.sort((a, b) => b.score - a.score || a.topic.order - b.topic.order);
  return results.slice(0, limit).map((r) => ({ ...r, snippet: makeSnippet(r.topic, r.matched) }));
}

/** Splits text into parts, marking the words that start with one of the matched words */
export function highlight(text: string, matched: string[]): HighlightPart[] {
  if (!matched.length || !text) return [{ text, hit: false }];
  const { norm, map } = normalizeWithMap(text);
  const parts: HighlightPart[] = [];
  let last = 0;
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) {
    const word = m[0];
    const hitWord = matched.find((w) => word === w || (w.length >= 3 && word.startsWith(w)));
    if (!hitWord) continue;
    const start = map[m.index];
    const end = map[m.index + word.length - 1] + 1;
    if (start > last) parts.push({ text: text.slice(last, start), hit: false });
    parts.push({ text: text.slice(start, end), hit: true });
    last = end;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}

/** About 180 characters of the body around the first matched word, highlighted */
export function makeSnippet(topic: HelpTopic, matched: string[], size = 180): HighlightPart[] {
  const text = topic.text.replace(/\s+/g, ' ').trim();
  const { norm, map } = normalizeWithMap(text);
  let at = -1;
  for (const word of matched) {
    const re = new RegExp(`(^|[^a-z0-9])${word.replace(/[^a-z0-9]/g, '')}`);
    const m = re.exec(norm);
    if (m && (at === -1 || m.index < at)) at = m.index + m[1].length;
  }
  let start = 0;
  if (at > 0) {
    const origin = map[at];
    start = Math.max(0, origin - 60);
    if (start > 0) {
      const space = text.indexOf(' ', start);
      if (space !== -1 && space < origin) start = space + 1;
    }
  }
  let end = Math.min(text.length, start + size);
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > start + size / 2) end = space;
  }
  const excerpt = (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '');
  return highlight(excerpt, matched);
}
