import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fr } from './fr';
import { plural, t, useI18nStore } from './index';

const SRC = path.resolve(__dirname, '..');

// Every source file of the app (tests excluded)
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'i18n' ? [] : sourceFiles(full);
    return /\.(tsx?|mts)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

// Literal texts passed to t('…') / plural(n, '…', '…')
function literalKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const literal = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
  const tCall = new RegExp(String.raw`\bt\(\s*(?:${literal})`, 'g');
  const pluralCall = new RegExp(String.raw`\bplural\([^,]+,\s*(?:${literal})\s*,\s*(?:${literal})`, 'g');
  const unescape = (s: string) => s.replace(/\\(.)/g, '$1');
  for (const file of sourceFiles(SRC)) {
    const code = readFileSync(file, 'utf8');
    const where = path.relative(SRC, file);
    for (const m of code.matchAll(tCall)) keys.set(unescape(m[1] ?? m[2]), where);
    for (const m of code.matchAll(pluralCall)) {
      keys.set(unescape(m[1] ?? m[2]), where);
      keys.set(unescape(m[3] ?? m[4]), where);
    }
  }
  return keys;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('French translations', () => {
  it('cover every text the app translates', () => {
    const missing = [...literalKeys()].filter(([key]) => !(key in fr)).map(([key, file]) => `${file}: ${key}`);
    expect(missing).toEqual([]);
  });

  it('keep every placeholder of the English text', () => {
    const broken = Object.entries(fr)
      .filter(([key, value]) => placeholders(key).join() !== placeholders(value).join())
      .map(([key, value]) => `${key} → ${value}`);
    expect(broken).toEqual([]);
  });
});

describe('t()', () => {
  afterEach(() => useI18nStore.setState({ personal: null, storeDefault: null, initial: 'en' }));

  it('returns English by default and French when chosen', () => {
    expect(t('Save')).toBe('Save');
    useI18nStore.setState({ personal: 'fr' });
    expect(t('Save')).toBe('Enregistrer');
  });

  it('prefers the personal choice over the store default', () => {
    useI18nStore.setState({ storeDefault: 'fr' });
    expect(t('Save')).toBe('Enregistrer');
    useI18nStore.setState({ personal: 'en' });
    expect(t('Save')).toBe('Save');
  });

  it('shows the English part of a context key and fills placeholders', () => {
    expect(t('Change|money')).toBe('Change');
    expect(t('Page {page} of {total}', { page: 2, total: 5 })).toBe('Page 2 of 5');
    useI18nStore.setState({ personal: 'fr' });
    expect(t('Change|money')).toBe('Monnaie');
    expect(t('Change')).toBe('Changer');
  });

  it('uses French plural rules (0 and 1 are singular)', () => {
    useI18nStore.setState({ personal: 'fr' });
    expect(plural(0, '{count} item', '{count} items')).toBe(t('{count} item', { count: 0 }));
  });
});
