import { defineConfig, devices } from '@playwright/test';

/**
 * Browser end-to-end tests (e2e/*.spec.ts) against the running app:
 * frontend on E2E_BASE_URL (default http://localhost:3001), backend API on
 * E2E_API_URL (default http://localhost:3000/api/v1). Neither is started here.
 *
 * global-setup creates a throwaway store directly in the database configured in
 * top-backend/.env; global-teardown deletes it again, even when tests fail.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  outputDir: './e2e/test-results',
  // The tests share one store: run them one at a time, in file order
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The database is remote: API calls and page loads can be slow
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { outputFolder: './e2e/playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    storageState: './e2e/.state/owner-storage.json',
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
