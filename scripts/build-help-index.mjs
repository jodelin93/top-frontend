#!/usr/bin/env node
/**
 * Help center compiler.
 *
 * Reads the help topics written in Markdown (src/help/content/<lang>/<topicId>.md) and
 * writes one JSON index per language (src/help/generated/index.<lang>.json) that the app
 * loads on demand. The index holds, per topic: the frontmatter, the body parsed into a
 * small block tree (rendered by src/help/markdown-view.tsx, never as raw HTML) and the
 * plain text used by the search.
 *
 * Runs before `next dev` / `next build` (package.json "predev" / "prebuild") and by
 * hand with `npm run help:index`. src/help/help-content.test.ts fails when the
 * committed index is not up to date.
 *
 * Markdown subset: #..#### headings, paragraphs, **bold**, *italic*, `code`, links
 * [text](topic:<id>) / [text](/app/path) / [text](https://...), numbered and bulleted
 * lists (one level), > blockquotes (tips/warnings), | tables |, --- rules and images
 * ![alt](shot:<name>) whose file is public/help/shots/<lang>/<name>.webp.
 * Raw HTML is not supported: it is shown as text.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HELP_LANGS = ['en', 'fr', 'ht', 'es'];

/** Frontmatter keys: required ones, then optional ones */
export const REQUIRED_KEYS = ['id', 'title', 'category', 'order', 'routes', 'keywords', 'related'];
export const OPTIONAL_KEYS = ['public', 'summary'];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- frontmatter

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const inner = value.slice(1, -1);
    return value.startsWith('"') ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'");
  }
  return value;
}

/** Splits a flow list "[a, "b, c", d]" into its items */
function parseFlowList(raw) {
  const inner = raw.trim().slice(1, -1);
  const items = [];
  let current = '';
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      items.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') items.push(current);
  return items.map((item) => parseScalar(item)).filter((item) => item !== '');
}

/**
 * YAML subset: `key: value`, `key: [a, b]`, or `key:` followed by `  - item` lines.
 * Returns { data, body }.
 */
export function parseFrontmatter(source) {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) throw new Error('missing frontmatter (the file must start with ---)');
  const end = text.indexOf('\n---', 4);
  if (end === -1) throw new Error('unterminated frontmatter');
  const head = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^[^\n]*\n/, '');
  const data = {};
  let listKey = null;
  for (const line of head.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const item = /^\s+-\s*(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(parseScalar(item[1]));
      continue;
    }
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`cannot read frontmatter line: ${line}`);
    const [, key, value] = pair;
    if (value.trim() === '') {
      data[key] = [];
      listKey = key;
    } else if (value.trim().startsWith('[')) {
      data[key] = parseFlowList(value);
      listKey = null;
    } else {
      data[key] = parseScalar(value);
      listKey = null;
    }
  }
  return { data, body };
}

// ---------------------------------------------------------------- inline markdown

/** Plain text of inline nodes */
export function inlineText(nodes) {
  return nodes
    .map((node) => {
      if (typeof node === 'string') return node;
      if (node.code !== undefined) return node.code;
      if (node.img !== undefined) return '';
      return inlineText(node.c ?? []);
    })
    .join('');
}

function pushText(out, text) {
  if (!text) return;
  if (typeof out[out.length - 1] === 'string') out[out.length - 1] += text;
  else out.push(text);
}

/**
 * Inline nodes: "text" | {b: [...]} (bold) | {i: [...]} (italic) | {code: "x"} |
 * {a: "href", c: [...]} (link) | {img: "shot name", alt: "..."}.
 * Bold and italic are stored as {t: 'b'|'i', c: [...]} to keep one shape.
 */
export function parseInline(text) {
  const out = [];
  let i = 0;
  let plain = '';
  const flush = () => {
    pushText(out, plain);
    plain = '';
  };
  while (i < text.length) {
    const ch = text[i];
    // Escaped character
    if (ch === '\\' && i + 1 < text.length && /[\\`*_[\]()!#>|-]/.test(text[i + 1])) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const close = text.indexOf('`', i + 1);
      if (close > i) {
        flush();
        out.push({ code: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }
    if (ch === '*' && text[i + 1] === '*') {
      const close = text.indexOf('**', i + 2);
      if (close > i + 2) {
        flush();
        out.push({ t: 'b', c: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }
    if ((ch === '*' || ch === '_') && text[i + 1] !== ch && text[i + 1] !== ' ') {
      // _ only at a word start (snake_case words stay as they are)
      const wordStart = i === 0 || /[\s(«"']/.test(text[i - 1]);
      if (ch === '*' || wordStart) {
        const close = text.indexOf(ch, i + 1);
        if (close > i + 1 && text[close - 1] !== ' ' && (ch === '*' || !/\w/.test(text[close + 1] ?? ''))) {
          flush();
          out.push({ t: 'i', c: parseInline(text.slice(i + 1, close)) });
          i = close + 1;
          continue;
        }
      }
    }
    if ((ch === '[' || (ch === '!' && text[i + 1] === '[')) && text.indexOf('](', i) > 0) {
      const image = ch === '!';
      const labelStart = image ? i + 2 : i + 1;
      const labelEnd = text.indexOf('](', labelStart);
      const hrefEnd = text.indexOf(')', labelEnd + 2);
      if (labelEnd > 0 && hrefEnd > labelEnd && !text.slice(labelStart, labelEnd).includes('\n')) {
        const label = text.slice(labelStart, labelEnd);
        const href = text.slice(labelEnd + 2, hrefEnd).trim();
        flush();
        if (image) out.push({ img: href.replace(/^shot:/, ''), alt: label });
        else out.push({ a: href, c: parseInline(label) });
        i = hrefEnd + 1;
        continue;
      }
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

// ---------------------------------------------------------------- block markdown

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TIP_WORDS = ['astuce', 'tip', 'konsey', 'consejo', 'bon a savoir', 'good to know', 'note'];
const WARNING_WORDS = ['attention', 'warning', 'atansyon', 'atencion', 'important'];

function calloutKind(blocks) {
  const first = blocks[0];
  if (!first || first.t !== 'p') return 'note';
  const lead = first.c[0];
  if (!lead || typeof lead === 'string' || lead.t !== 'b') return 'note';
  const word = slugify(inlineText(lead.c)).replace(/-/g, ' ').trim();
  if (WARNING_WORDS.some((w) => word.startsWith(w))) return 'warning';
  if (TIP_WORDS.some((w) => word.startsWith(w))) return 'tip';
  return 'note';
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => parseInline(cell.trim().replace(/\\\|/g, '|')));

/**
 * Blocks: {t:'h', level, id, c} | {t:'p', c} | {t:'ol'|'ul', start?, items: [inline[]]} |
 * {t:'quote', kind: 'tip'|'warning'|'note', c: blocks} | {t:'table', head, rows} |
 * {t:'img', shot, alt} | {t:'hr'} | {t:'code', text}
 */
export function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const isBlank = (line) => line === undefined || line.trim() === '';
  const startsBlock = (line) =>
    /^(#{1,4})\s/.test(line) ||
    /^\s*([-*+]|\d+[.)])\s+/.test(line) ||
    line.startsWith('>') ||
    line.trim().startsWith('|') ||
    /^(-{3,}|\*{3,})\s*$/.test(line.trim()) ||
    line.startsWith('```');

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i += 1;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const c = parseInline(heading[2].trim());
      blocks.push({ t: 'h', level: heading[1].length, id: slugify(inlineText(c)), c });
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const body = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i += 1;
      blocks.push({ t: 'code', text: body.join('\n') });
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      blocks.push({ t: 'hr' });
      i += 1;
      continue;
    }
    if (line.startsWith('>')) {
      const inner = [];
      while (i < lines.length && lines[i].startsWith('>')) inner.push(lines[i++].replace(/^>\s?/, ''));
      const c = parseBlocks(inner.join('\n'));
      blocks.push({ t: 'quote', kind: calloutKind(c), c });
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const isSeparator = (row) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(row);
      const head = splitRow(rows[0]);
      const body = rows.slice(isSeparator(rows[1] ?? '') ? 2 : 1).map(splitRow);
      blocks.push({ t: 'table', head, rows: body });
      continue;
    }
    const listItem = /^\s*([-*+]|(\d+)[.)])\s+(.*)$/.exec(line);
    if (listItem) {
      const ordered = listItem[2] !== undefined;
      const items = [];
      let start = ordered ? Number(listItem[2]) : undefined;
      while (i < lines.length) {
        const m = /^\s*([-*+]|(\d+)[.)])\s+(.*)$/.exec(lines[i]);
        if (m && (m[2] !== undefined) === ordered) {
          items.push(m[3]);
          i += 1;
        } else if (!isBlank(lines[i]) && !startsBlock(lines[i]) && items.length) {
          // Continuation of the previous item
          items[items.length - 1] += ' ' + lines[i].trim();
          i += 1;
        } else if (isBlank(lines[i]) && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i + 1] ?? '')) {
          // A blank line between items keeps the same list
          const next = /^\s*([-*+]|(\d+)[.)])\s+/.exec(lines[i + 1]);
          if ((next[2] !== undefined) !== ordered) break;
          i += 1;
        } else {
          break;
        }
      }
      const block = { t: ordered ? 'ol' : 'ul', items: items.map((item) => parseInline(item.trim())) };
      if (ordered && start !== 1) block.start = start;
      blocks.push(block);
      continue;
    }
    // Paragraph
    const para = [];
    while (i < lines.length && !isBlank(lines[i]) && (para.length === 0 || !startsBlock(lines[i]))) {
      para.push(lines[i].trim());
      i += 1;
    }
    const c = parseInline(para.join(' '));
    if (c.length === 1 && typeof c[0] !== 'string' && c[0].img !== undefined) {
      blocks.push({ t: 'img', shot: c[0].img, alt: c[0].alt });
    } else {
      blocks.push({ t: 'p', c });
    }
  }
  return blocks;
}

/** Plain text of blocks (search), one line per block */
export function blocksText(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.t === 'p' || block.t === 'h') lines.push(inlineText(block.c));
    else if (block.t === 'ol' || block.t === 'ul') lines.push(...block.items.map(inlineText));
    else if (block.t === 'quote') lines.push(blocksText(block.c));
    else if (block.t === 'table') {
      lines.push(block.head.map(inlineText).join(' · '));
      for (const row of block.rows) lines.push(row.map(inlineText).join(' · '));
    } else if (block.t === 'code') lines.push(block.text);
  }
  return lines.filter(Boolean).join('\n');
}

/** Shot names referenced by blocks (block images and inline images) */
export function blocksShots(blocks) {
  const shots = [];
  const inline = (nodes) => {
    for (const node of nodes) {
      if (typeof node === 'string') continue;
      if (node.img !== undefined) shots.push(node.img);
      if (node.c) inline(node.c);
    }
  };
  for (const block of blocks) {
    if (block.t === 'img') shots.push(block.shot);
    else if (block.t === 'p' || block.t === 'h') inline(block.c);
    else if (block.t === 'ol' || block.t === 'ul') block.items.forEach(inline);
    else if (block.t === 'quote') shots.push(...blocksShots(block.c));
    else if (block.t === 'table') [block.head, ...block.rows].forEach((row) => row.forEach(inline));
  }
  return shots;
}

// ---------------------------------------------------------------- topics

const asList = (value) => (Array.isArray(value) ? value.map(String) : value === undefined || value === '' ? [] : [String(value)]);

/** One topic file → its index entry (throws with the file name on bad input) */
export function compileTopic(source, file = 'topic') {
  let parsed;
  try {
    parsed = parseFrontmatter(source);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
  const { data, body } = parsed;
  for (const key of REQUIRED_KEYS) {
    if (data[key] === undefined) throw new Error(`${file}: frontmatter "${key}" is missing`);
  }
  for (const key of Object.keys(data)) {
    if (!REQUIRED_KEYS.includes(key) && !OPTIONAL_KEYS.includes(key)) {
      throw new Error(`${file}: unknown frontmatter "${key}"`);
    }
  }
  if (typeof data.order !== 'number') throw new Error(`${file}: "order" must be a number`);
  const blocks = parseBlocks(body);
  return {
    id: String(data.id),
    title: String(data.title),
    category: String(data.category),
    order: data.order,
    routes: asList(data.routes),
    keywords: asList(data.keywords),
    related: asList(data.related),
    ...(data.public === true ? { public: true } : {}),
    ...(data.summary ? { summary: String(data.summary) } : {}),
    headings: blocks.filter((b) => b.t === 'h').map((b) => inlineText(b.c)),
    shots: [...new Set(blocksShots(blocks))],
    text: blocksText(blocks.filter((b) => b.t !== 'h')),
    blocks,
  };
}

/** Topic files of a language: [{ file, source }] sorted by name */
export function readTopicFiles(lang, root = ROOT) {
  const dir = join(root, 'src/help/content', lang);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ file: join(dir, name), name, source: readFileSync(join(dir, name), 'utf8') }));
}

/** Index of one language: { lang, topics } with topics sorted by order, then id */
export function buildLanguageIndex(lang, root = ROOT) {
  const topics = readTopicFiles(lang, root).map(({ name, source }) => {
    const topic = compileTopic(source, `${lang}/${name}`);
    if (`${topic.id}.md` !== name) throw new Error(`${lang}/${name}: id "${topic.id}" does not match the file name`);
    return topic;
  });
  topics.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { lang, topics };
}

export const indexPath = (lang, root = ROOT) => join(root, 'src/help/generated', `index.${lang}.json`);

/** The exact file content written for a language (the freshness test compares it) */
export const serializeIndex = (index) => JSON.stringify(index) + '\n';

export function buildHelpIndex(root = ROOT) {
  mkdirSync(join(root, 'src/help/generated'), { recursive: true });
  const written = [];
  for (const lang of HELP_LANGS) {
    const index = buildLanguageIndex(lang, root);
    const target = indexPath(lang, root);
    const content = serializeIndex(index);
    const previous = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (previous !== content) writeFileSync(target, content);
    written.push({ lang, topics: index.topics.length, changed: previous !== content });
  }
  return written;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = buildHelpIndex();
    console.log(
      'help index: ' + result.map((r) => `${r.lang} ${r.topics} topics${r.changed ? ' (updated)' : ''}`).join(', ')
    );
  } catch (error) {
    console.error(`help index: ${error.message}`);
    process.exit(1);
  }
}
