/**
 * Keep-in-sync guards for the help center (src/help/content). They fail when:
 *  - a language lacks a topic, or a topic's frontmatter differs between languages;
 *  - a screenshot used by a topic is missing for a language;
 *  - an app page has no help topic;
 *  - src/help/generated is stale (run `npm run help:index`);
 *  - a topic links to, or the code opens, a topic that does not exist.
 * See docs/help-authoring.md.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildLanguageIndex,
  HELP_LANGS,
  indexPath,
  serializeIndex,
} from '../../scripts/build-help-index.mjs';
import { adminNav } from '@/lib/admin-nav';
import { routeScore } from './routes';
import type { HelpIndex, HelpTopic } from './types';
import manifest from './shots.manifest.json';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_LANG = 'fr';
const indexes = Object.fromEntries(HELP_LANGS.map((lang) => [lang, buildLanguageIndex(lang, ROOT) as HelpIndex]));
const source = indexes[SOURCE_LANG].topics;
const sourceIds = source.map((t) => t.id).sort();
const byId = new Map(source.map((t) => [t.id, t]));

// Frontmatter that must be identical in every language (the rest is translated)
const shared = (t: HelpTopic) => ({
  order: t.order,
  routes: t.routes,
  related: t.related,
  public: t.public ?? false,
  shots: [...t.shots].sort(),
});

describe('help content', () => {
  it('has topics in the source language (French)', () => {
    expect(source.length).toBeGreaterThan(50);
  });

  describe.each(HELP_LANGS.filter((l) => l !== SOURCE_LANG))('%s translation', (lang) => {
    it('has every topic of the source language and no other', () => {
      const ids = indexes[lang].topics.map((t) => t.id).sort();
      expect({ missing: sourceIds.filter((id) => !ids.includes(id)), extra: ids.filter((id) => !sourceIds.includes(id)) })
        .toEqual({ missing: [], extra: [] });
    });

    it('keeps the same frontmatter (order, routes, related, public) and the same screenshots', () => {
      const different = indexes[lang].topics
        .filter((t) => byId.has(t.id))
        .filter((t) => JSON.stringify(shared(t)) !== JSON.stringify(shared(byId.get(t.id)!)))
        .map((t) => t.id);
      expect(different).toEqual([]);
    });
  });

  it.each(HELP_LANGS)('%s topics have a title, a category and keywords', (lang) => {
    const incomplete = indexes[lang].topics
      .filter((t) => !t.title.trim() || !t.category.trim() || t.keywords.length === 0 || t.blocks.length === 0)
      .map((t) => t.id);
    expect(incomplete).toEqual([]);
  });

  it.each(HELP_LANGS)('%s screenshots exist for every shot the topics use', (lang) => {
    // A language without its own topics yet is checked against the French topics
    const topics = indexes[lang].topics.length ? indexes[lang].topics : source;
    const missing = [...new Set(topics.flatMap((t) => t.shots))].filter(
      (shot) => !existsSync(path.join(ROOT, 'public/help/shots', lang, `${shot}.webp`))
    );
    expect(missing).toEqual([]);
  });

  it('has a screenshot recipe for every shot used', () => {
    const shots = manifest.shots as Record<string, unknown>;
    const used = [...new Set(source.flatMap((t) => t.shots))];
    expect(used.filter((shot) => !shots[shot])).toEqual([]);
  });

  it('links only to existing topics', () => {
    const broken: string[] = [];
    for (const lang of HELP_LANGS) {
      for (const topic of indexes[lang].topics) {
        for (const id of topic.related) if (!byId.has(id)) broken.push(`${lang}/${topic.id} related ${id}`);
        const links = JSON.stringify(topic.blocks).match(/"a":"topic:[^"]+"/g) ?? [];
        for (const link of links) {
          const id = link.slice('"a":"topic:'.length, -1);
          if (!byId.has(id)) broken.push(`${lang}/${topic.id} → ${id}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('covers every admin menu page', () => {
    const uncovered = adminNav
      .flatMap((section) => section.items.map((item) => item.href))
      .filter((href) => !source.some((t) => t.routes.some((route) => routeScore(route, href) > 0)));
    expect(uncovered).toEqual([]);
  });

  it('covers every page of the app', () => {
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'page.tsx') pages.push(path.relative(path.join(ROOT, 'src/app'), dir));
      }
    };
    walk(path.join(ROOT, 'src/app'));
    const routes = pages.map(
      (dir) =>
        '/' +
        dir
          .split(path.sep)
          .filter((segment) => segment && !segment.startsWith('[') && !segment.startsWith('('))
          .join('/')
    );
    const uncovered = routes.filter((route) => !source.some((t) => t.routes.some((r) => routeScore(r, route) > 0)));
    expect(uncovered).toEqual([]);
  });

  it('opens only existing topics from the code (useHelpContext, HelpButton, HelpLink, *_HELP maps)', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
      }
    };
    walk(path.join(ROOT, 'src'));
    const referenced = new Set<string>();
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      for (const m of code.matchAll(/useHelpContext\(([\s\S]*?)\);/g)) {
        // Topic ids, not the values they are compared with (tab === 'stored' ? ...)
        for (const lit of m[1].matchAll(/(?<![=!]==\s*)'([a-z0-9-]+)'/g)) referenced.add(lit[1]);
      }
      for (const m of code.matchAll(/const \w+_(?:HELP|TOPICS)\b[^=]*=\s*\{([\s\S]*?)\};/g)) {
        for (const lit of m[1].matchAll(/:\s*'([a-z0-9-]+)'/g)) referenced.add(lit[1]);
      }
      for (const m of code.matchAll(/topicId="([a-z0-9-]+)"/g)) referenced.add(m[1]);
    }
    expect(referenced.size).toBeGreaterThan(20);
    expect([...referenced].filter((id) => !byId.has(id))).toEqual([]);
  });

  it.each(HELP_LANGS)('generated index for %s is up to date (run `npm run help:index`)', (lang) => {
    const file = indexPath(lang, ROOT);
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    expect(current === serializeIndex(indexes[lang])).toBe(true);
  });
});
