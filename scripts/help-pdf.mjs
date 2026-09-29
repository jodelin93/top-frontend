#!/usr/bin/env node
/**
 * Prints the whole help manual of each language to a PDF: the "Download the PDF" button
 * of the help center (public/help/pdf/joda-pos-manual-<lang>.pdf).
 *
 *   node scripts/help-pdf.mjs --lang fr     # one language
 *   node scripts/help-pdf.mjs --lang all    # en, fr, ht, es
 *
 * Needs the app running, like help-screenshots.mjs (same HELP_SHOTS_* variables and
 * session). Run it after `npm run help:index` and the screenshots: it prints the page
 * /help/print. public/help/pdf/manifest.json records which version of the topics each PDF
 * was made from; the help tests fail when a PDF is older than its topics.
 */
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HELP_LANGS, indexPath } from './build-help-index.mjs';
import { BASE_URL, ROOT, languageContext, signIn } from './help-session.mjs';

const OUT_DIR = join(ROOT, 'public/help/pdf');
const MANIFEST = join(OUT_DIR, 'manifest.json');

/** Version of a language's topics: hash of its generated index */
export const topicsVersion = (lang, root = ROOT) =>
  createHash('sha256').update(readFileSync(indexPath(lang, root))).digest('hex').slice(0, 16);

function parseLangs(argv) {
  const i = argv.indexOf('--lang');
  const value = i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'all';
  const langs = value === 'all' ? HELP_LANGS : value.split(',');
  for (const lang of langs) if (!HELP_LANGS.includes(lang)) throw new Error(`unknown language ${lang}`);
  return langs;
}

async function main() {
  const langs = parseLangs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const browser = await chromium.launch();
  try {
    await signIn(browser);
    for (const lang of langs) {
      const context = await languageContext(browser, lang, { viewport: { width: 900, height: 1200 } });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/help/print`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-help-print-ready]', { timeout: 60_000 });
      // Every screenshot loaded (or failed over to its fallback language)
      await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, { timeout: 120_000 });
      // Screenshots as JPEG: Chromium keeps JPEG data as is in the PDF but stores other
      // formats uncompressed (a 17 MB file instead of a few MB)
      await page.evaluate(async () => {
        for (const img of [...document.images]) {
          if (!img.naturalWidth || img.src.startsWith('data:')) continue;
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          img.src = canvas.toDataURL('image/jpeg', 0.72);
          await img.decode().catch(() => {});
        }
      });
      await page.waitForTimeout(500);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="width:100%;font-size:8px;color:#888;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      });
      const file = `joda-pos-manual-${lang}.pdf`;
      writeFileSync(join(OUT_DIR, file), pdf);
      manifest[lang] = { file, topics: topicsVersion(lang) };
      console.log(`${lang}: ${file} (${Math.round(pdf.length / 1024)} KB)`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
