import { describe, expect, it } from 'vitest';
import { es } from './es';
import { fr } from './fr';
import { ht } from './ht';

// French is the reference: every text translated into French must also exist in the other
// languages, with the same placeholders ({name}, {count}, ...) as the English key.
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

const languages: [string, Record<string, string>][] = [
  ['Haitian Creole (ht)', ht],
  ['Spanish (es)', es],
];

describe.each(languages)('%s translations', (_name, dictionary) => {
  it('have every text that French has', () => {
    const missing = Object.keys(fr).filter((key) => !(key in dictionary));
    expect(missing).toEqual([]);
  });

  it('keep every placeholder of the English text', () => {
    const broken = Object.entries(dictionary)
      .filter(([key, value]) => placeholders(key) !== placeholders(value))
      .map(([key, value]) => `${key} → ${value}`);
    expect(broken).toEqual([]);
  });

  it('have no empty translation', () => {
    const empty = Object.entries(dictionary)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
