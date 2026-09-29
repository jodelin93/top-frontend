/**
 * Browser session shared by the help scripts (help-screenshots.mjs, help-pdf.mjs): signs
 * in once as HELP_SHOTS_EMAIL / HELP_SHOTS_PASSWORD and keeps the session in
 * node_modules/.cache/help-shots/, and opens browser contexts in a given app language.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_URL = (process.env.HELP_SHOTS_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const EMAIL = process.env.HELP_SHOTS_EMAIL ?? 'admin@test.com';
const PASSWORD = process.env.HELP_SHOTS_PASSWORD;
const STATE_DIR = join(ROOT, 'node_modules/.cache/help-shots');
export const STATE_FILE = join(STATE_DIR, 'owner-storage.json');

const LOCALES = { en: 'en-US', fr: 'fr-FR', ht: 'fr-HT', es: 'es-419' };

export async function signIn(browser) {
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

/** A browser context showing the app in `lang` (signed in unless `signedOut`) */
export async function languageContext(browser, lang, { signedOut = false, ...options } = {}) {
  const context = await browser.newContext({
    ...options,
    storageState: signedOut ? undefined : STATE_FILE,
    locale: LOCALES[lang],
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
  return context;
}
