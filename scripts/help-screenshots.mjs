#!/usr/bin/env node
/**
 * Captures the screenshots of the help center (public/help/shots/<lang>/<name>.webp).
 *
 *   node scripts/help-screenshots.mjs --lang fr            # every shot the French topics use
 *   node scripts/help-screenshots.mjs --lang all           # en, fr, ht, es
 *   node scripts/help-screenshots.mjs --lang fr --only pos-payment,pos-cart
 *   node scripts/help-screenshots.mjs --lang fr --missing  # only shots without a file yet
 *
 * Needs the app running (frontend on HELP_SHOTS_BASE_URL, default http://localhost:3001,
 * with the API behind it) and a store with some data. Signs in once as HELP_SHOTS_EMAIL /
 * HELP_SHOTS_PASSWORD (required; email defaults to the development owner admin@test.com) and keeps the
 * session in node_modules/.cache/help-shots/ so later runs do not sign in again.
 *
 * What to capture is described in src/help/shots.manifest.json, one entry per shot name:
 *
 *   "pos-payment": {
 *     "viewport": "desktop" | "phone",          // 1280x800 or 390x844
 *     "steps": [ ...see runStep() below... ],
 *     "capture": "page" | "dialog" | { "css": "..." } | { "testid": "..." }
 *   }
 *
 * Texts in steps (button names, labels) are written in ENGLISH, exactly as passed to t()
 * in the code: they are translated with the app's own dictionaries (src/i18n/<lang>), so
 * one manifest serves every language. Shot names never depend on the language.
 * Images are WebP (quality 0.7, lowered until the file is under 60 KB).
 */
import { chromium } from '@playwright/test';
import ts from 'typescript';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLanguageIndex, HELP_LANGS } from './build-help-index.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = (process.env.HELP_SHOTS_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const EMAIL = process.env.HELP_SHOTS_EMAIL ?? 'admin@test.com';
const PASSWORD = process.env.HELP_SHOTS_PASSWORD;
const STATE_DIR = join(ROOT, 'node_modules/.cache/help-shots');
const STATE_FILE = join(STATE_DIR, 'owner-storage.json');
const MAX_BYTES = 60 * 1024;
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const args = { lang: 'fr', only: null, missing: false, headed: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i];
    if (arg === '--lang') args.lang = value();
    else if (arg.startsWith('--lang=')) args.lang = arg.slice(7);
    else if (arg === '--only') args.only = value().split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--only=')) args.only = arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--missing') args.missing = true;
    else if (arg === '--all-manifest') args.all = true;
    else if (arg === '--headed') args.headed = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else throw new Error(`unknown argument ${arg}`);
  }
  const langs = args.lang === 'all' ? HELP_LANGS : args.lang.split(',');
  for (const lang of langs) if (!HELP_LANGS.includes(lang)) throw new Error(`unknown language ${lang}`);
  return { ...args, langs };
}

// ---------------------------------------------------------------- translations

/** Loads src/i18n/<lang>/index.ts (TypeScript, CommonJS-transpiled on the fly) */
function loadTsModule(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  cache.set(file, loaded);
  const require = (spec) => {
    if (!spec.startsWith('.')) throw new Error(`${file}: only relative imports are supported (${spec})`);
    const base = resolve(dirname(file), spec);
    const target = [base, `${base}.ts`, join(base, 'index.ts')].find((p) => existsSync(p) && p.endsWith('.ts'));
    if (!target) throw new Error(`${file}: cannot resolve ${spec}`);
    return loadTsModule(target, cache);
  };
  new Function('exports', 'require', 'module', outputText)(loaded.exports, require, loaded);
  return loaded.exports;
}

function translator(lang) {
  const englishOf = (key) => (key.includes('|') ? key.slice(0, key.indexOf('|')) : key);
  if (lang === 'en') return englishOf;
  const dictionary = loadTsModule(join(ROOT, 'src/i18n', lang, 'index.ts'))[lang];
  if (!dictionary) throw new Error(`no dictionary for ${lang}`);
  return (key) => dictionary[key] ?? englishOf(key);
}

// ---------------------------------------------------------------- browser helpers

const exactOrNot = (spec) => spec.exact === true;

/**
 * A locator from a step target: {role,name} | {text} | {label} | {placeholder} | {css} |
 * {testid} | {title} | {ariaPrefix}. Add "closestClass": "p-4" to take the nearest enclosing
 * element with that class instead. Add "within": "dialog" to search the open dialog only and
 * "nth": n (-1 = last) to pick one of several matches (default: the first), and "raw": true
 * when the text is store data (product or payment method names) and must not be translated.
 */
function locate(page, target, translate) {
  // "raw": true for texts that are data, not app texts (a payment method named "Cash")
  const tr = target.raw ? (text) => text : translate;
  const scope = target.within === 'dialog' ? page.getByRole('dialog').last() : page;
  let locator;
  if (target.role) {
    locator = scope.getByRole(target.role, target.name ? { name: tr(target.name), exact: exactOrNot(target) } : {});
  } else if (target.text) locator = scope.getByText(tr(target.text), { exact: exactOrNot(target) });
  else if (target.label) locator = scope.getByLabel(tr(target.label), { exact: exactOrNot(target) });
  else if (target.placeholder) locator = scope.getByPlaceholder(tr(target.placeholder), { exact: exactOrNot(target) });
  else if (target.css) locator = scope.locator(target.css);
  else if (target.ariaPrefix) {
    // English key with placeholders, e.g. "Change price of {product}, now {price}": matches
    // the translated text before the first placeholder
    const prefix = tr(target.ariaPrefix).split('{')[0];
    locator = scope.locator(`[aria-label^="${prefix.replace(/["\\]/g, '\\$&')}"]`);
  }
  else if (target.testid) locator = scope.getByTestId(target.testid);
  else if (target.title) locator = scope.getByTitle(tr(target.title), { exact: exactOrNot(target) });
  else throw new Error(`cannot locate ${JSON.stringify(target)}`);
  locator = target.nth === undefined ? locator.first() : target.nth === -1 ? locator.last() : locator.nth(target.nth);
  // "closestClass": the nearest enclosing element with this class (e.g. the card around a title)
  if (target.closestClass) {
    locator = locator.locator(
      `xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ${target.closestClass} ')][1]`
    );
  }
  return locator;
}

/**
 * Steps:
 *   { "goto": "/admin/inventory" }                   open a page (waits for the network)
 *   { "click": <target> }                            click (target: see locate())
 *   { "fill": <target>, "value": "..." }             type into a field ("value" is not translated)
 *   { "select": <target>, "option": "..." }          choose an option by its (translated) label
 *   { "press": "F1" }                                a key
 *   { "hover": <target> }
 *   { "waitFor": <target> }                          wait until visible
 *   { "wait": 500 }                                  milliseconds
 *   { "offline": true | false }                      cut / restore the network
 *   { "scroll": <target> }                           scroll an element into view
 * Any step may carry "optional": true (errors are ignored).
 */
async function runStep(page, context, step, tr) {
  if (step.goto !== undefined) {
    await page.goto(BASE_URL + step.goto, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  } else if (step.click) await locate(page, step.click, tr).click({ timeout: 10_000 });
  else if (step.fill) await locate(page, step.fill, tr).fill(String(step.value ?? ''), { timeout: 10_000 });
  else if (step.select) await locate(page, step.select, tr).selectOption({ label: tr(step.option) }, { timeout: 10_000 });
  else if (step.press) await page.keyboard.press(step.press);
  else if (step.hover) await locate(page, step.hover, tr).hover({ timeout: 10_000 });
  else if (step.waitFor) await locate(page, step.waitFor, tr).waitFor({ state: 'visible', timeout: 15_000 });
  else if (step.scroll) await locate(page, step.scroll, tr).scrollIntoViewIfNeeded({ timeout: 10_000 });
  else if (step.wait !== undefined) await page.waitForTimeout(step.wait);
  else if (step.offline !== undefined) await context.setOffline(step.offline);
  else throw new Error(`unknown step ${JSON.stringify(step)}`);
}

/** PNG → WebP with the browser's encoder, under MAX_BYTES if possible */
async function toWebp(converter, png) {
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  for (const [quality, scale] of [
    [0.7, 1],
    [0.55, 1],
    [0.45, 1],
    [0.45, 0.85],
    [0.4, 0.7],
  ]) {
    const webp = await converter.evaluate(
      async ({ dataUrl, quality, scale }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', quality);
      },
      { dataUrl, quality, scale }
    );
    const buffer = Buffer.from(webp.split(',')[1], 'base64');
    if (buffer.length <= MAX_BYTES || (quality === 0.4 && scale === 0.7)) return buffer;
  }
  throw new Error('unreachable');
}

async function signIn(browser) {
  mkdirSync(STATE_DIR, { recursive: true });
  if (existsSync(STATE_FILE)) {
    const context = await browser.newContext({ storageState: STATE_FILE });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const ok = !page.url().includes('/auth/login');
    await context.close();
    if (ok) return;
  }
  console.log(`signing in as ${EMAIL}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(EMAIL);
  if (!PASSWORD) throw new Error('Set HELP_SHOTS_PASSWORD to the sign-in password of HELP_SHOTS_EMAIL.');
  await page.locator('#password').fill(PASSWORD);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 30_000 }).catch(async () => {
    const message = await page.locator('.text-red-600').first().textContent().catch(() => '');
    throw new Error(`sign-in failed: ${message}. Stopping (repeated failures lock the account).`);
  });
  await context.storageState({ path: STATE_FILE });
  await context.close();
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(join(ROOT, 'src/help/shots.manifest.json'), 'utf8'));
  const browser = await chromium.launch({ headless: !args.headed });
  let failures = 0;
  try {
    await signIn(browser);
    const converterContext = await browser.newContext();
    const converter = await converterContext.newPage();

    for (const lang of args.langs) {
      const tr = translator(lang);
      const referenced = [...new Set(buildLanguageIndex(lang).topics.flatMap((topic) => topic.shots))];
      let names = args.all ? Object.keys(manifest.shots) : referenced;
      if (args.only) names = names.filter((name) => args.only.includes(name)).concat(args.only.filter((n) => !names.includes(n) && manifest.shots[n]));
      const outDir = join(ROOT, 'public/help/shots', lang);
      mkdirSync(outDir, { recursive: true });
      if (args.missing) names = names.filter((name) => !existsSync(join(outDir, `${name}.webp`)));
      console.log(`${lang}: ${names.length} screenshot(s)`);

      for (const name of names) {
        const spec = manifest.shots[name];
        if (!spec) {
          console.warn(`  ! ${name}: not in src/help/shots.manifest.json`);
          failures += 1;
          continue;
        }
        const device = VIEWPORTS[spec.viewport ?? 'desktop'];
        const context = await browser.newContext({
          ...device,
          storageState: spec.signedOut ? undefined : STATE_FILE,
          locale: { en: 'en-US', fr: 'fr-FR', ht: 'fr-HT', es: 'es-419' }[lang],
          reducedMotion: 'reduce',
        });
        await context.addCookies([{ name: 'lang', value: lang, url: BASE_URL }]);
        await context.addInitScript((code) => {
          try {
            localStorage.setItem('language', JSON.stringify({ state: { personal: code }, version: 0 }));
          } catch {
            /* storage unavailable */
          }
          // Hide the Next.js development indicator ("Compiling...")
          const hide = () => {
            const style = document.createElement('style');
            style.textContent = 'nextjs-portal { display: none !important; }';
            document.head.appendChild(style);
          };
          if (document.head) hide();
          else document.addEventListener('DOMContentLoaded', hide);
        }, lang);
        const page = await context.newPage();
        try {
          for (const step of spec.steps ?? []) {
            try {
              await runStep(page, context, step, tr);
            } catch (error) {
              if (!step.optional) throw error;
            }
          }
          await page.waitForTimeout(spec.settle ?? 400);
          let png;
          const capture = spec.capture ?? 'page';
          if (capture === 'page') png = await page.screenshot({ animations: 'disabled' });
          else if (capture === 'dialog') png = await page.getByRole('dialog').last().screenshot({ animations: 'disabled' });
          else png = await locate(page, capture, tr).screenshot({ animations: 'disabled' });
          const webp = await toWebp(converter, png);
          writeFileSync(join(outDir, `${name}.webp`), webp);
          console.log(`  ✓ ${name} (${Math.round(webp.length / 1024)} KB)`);
        } catch (error) {
          failures += 1;
          console.warn(`  ✗ ${name}: ${String(error.message).split('\n')[0]}`);
        } finally {
          await context.setOffline(false).catch(() => {});
          await context.close();
        }
      }
    }
    await converterContext.close();
  } finally {
    await browser.close();
  }
  if (failures) {
    console.warn(`${failures} screenshot(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
