import { describe, expect, it } from 'vitest';
import { buildLanguageIndex, compileTopic, parseBlocks, parseInline } from '../../scripts/build-help-index.mjs';
import { mergeWithFallback } from './load';
import { routeScore, topicForRoute } from './routes';
import { editDistance, highlight, normalize, searchTopics } from './search';
import type { HelpIndex, HelpTopic } from './types';

const fr = buildLanguageIndex('fr') as HelpIndex;

describe('help search', () => {
  it('ignores accents and case', () => {
    expect(normalize('Écart À Rendre')).toBe('ecart a rendre');
    expect(searchTopics(fr.topics, 'ETIQUETTE')[0]?.topic.id).toBe(searchTopics(fr.topics, 'étiquette')[0]?.topic.id);
  });

  it('finds the change-giving topic for "monnaie"', () => {
    const ids = searchTopics(fr.topics, 'monnaie').slice(0, 3).map((r) => r.topic.id);
    expect(ids).toContain('pos-payment-cash-change');
  });

  it('ranks a title match first', () => {
    expect(searchTopics(fr.topics, 'transférer du stock')[0].topic.id).toBe('inventory-transfers');
  });

  it('tolerates a small typo', () => {
    expect(editDistance('transfert', 'tranfert', 2)).toBe(1);
    expect(searchTopics(fr.topics, 'tranfert').map((r) => r.topic.id)).toContain('inventory-transfers');
  });

  it('highlights matched words in the original text', () => {
    const parts = highlight('Rendre la monnaie en gourdes', ['monnaie']);
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['monnaie']);
    expect(parts.map((p) => p.text).join('')).toBe('Rendre la monnaie en gourdes');
  });

  it('returns snippets that contain a match', () => {
    const [first] = searchTopics(fr.topics, 'monnaie');
    expect(first.snippet.some((p) => p.hit)).toBe(true);
  });
});

describe('help routes', () => {
  it('matches paths, sub-paths and query values', () => {
    expect(routeScore('/admin/inventory', '/admin/inventory')).toBeGreaterThan(0);
    expect(routeScore('/admin/customers', '/admin/customers/accounts')).toBeGreaterThan(0);
    expect(routeScore('/admin/customers/accounts', '/admin/customers/accounts')).toBeGreaterThan(
      routeScore('/admin/customers', '/admin/customers/accounts')
    );
    expect(routeScore('/admin/inventory?tab=transfers', '/admin/inventory', '')).toBe(0);
    expect(routeScore('/admin/inventory?tab=transfers', '/admin/inventory', '?tab=transfers')).toBeGreaterThan(0);
    expect(routeScore('/', '/pos')).toBe(0);
  });

  it('picks the main topic of a page', () => {
    expect(topicForRoute(fr.topics, '/pos')?.id).toBe('pos-overview');
    expect(topicForRoute(fr.topics, '/admin/inventory')?.id).toBe('inventory-stock');
    expect(topicForRoute(fr.topics, '/admin/customers/accounts')?.id).toBe('customers-accounts');
    expect(topicForRoute(fr.topics, '/auth/login')?.id).toBe('auth-login');
  });
});

describe('help markdown compiler', () => {
  it('parses inline marks and links without HTML', () => {
    expect(parseInline('Cliquez sur **Encaisser** puis voir [le paiement](topic:pos-payment) et `F12`')).toEqual([
      'Cliquez sur ',
      { t: 'b', c: ['Encaisser'] },
      ' puis voir ',
      { a: 'topic:pos-payment', c: ['le paiement'] },
      ' et ',
      { code: 'F12' },
    ]);
    expect(parseInline('<script>alert(1)</script>')).toEqual(['<script>alert(1)</script>']);
  });

  it('parses lists, tables, callouts and images', () => {
    const blocks = parseBlocks(
      '1. Un\n2. Deux\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n> **Attention :** prudence.\n\n![Alt](shot:pos-payment)'
    );
    expect(blocks.map((b: { t: string }) => b.t)).toEqual(['ol', 'table', 'quote', 'img']);
    expect(blocks[2]).toMatchObject({ kind: 'warning' });
    expect(blocks[3]).toEqual({ t: 'img', shot: 'pos-payment', alt: 'Alt' });
  });

  it('rejects a topic without the required frontmatter', () => {
    expect(() => compileTopic('---\nid: x\n---\nText', 'x.md')).toThrow(/title/);
  });

  it('falls back to English then French for missing topics', () => {
    const topic = (id: string, title: string) => ({ ...fr.topics[0], id, title }) as HelpTopic;
    const merged = mergeWithFallback('ht', [
      { lang: 'ht', topics: [topic('a', 'ht a')] },
      { lang: 'en', topics: [topic('a', 'en a'), topic('b', 'en b')] },
      { lang: 'fr', topics: [topic('b', 'fr b'), topic('c', 'fr c')] },
    ]);
    expect(merged.topics.map((t) => `${t.lang}:${t.title}`).sort()).toEqual(['en:en b', 'fr:fr c', 'ht:ht a']);
  });
});
