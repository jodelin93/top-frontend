/**
 * Creates this run's throwaway store straight in the database (store sign-up is
 * throttled and may be disabled), sets it up through the API, signs the owner in
 * through the UI once and saves the browser storage for the tests.
 * On any failure the store is deleted again before the error is rethrown.
 */
import { chromium, type FullConfig } from '@playwright/test';
import { Api } from './support/api';
import { connect, createTenant, deleteTenant, SLUG_PREFIX } from './support/db';
import { RunState, STORAGE_STATE, writeState } from './support/state';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3001';
  const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const state: RunState = {
    run,
    slug: `${SLUG_PREFIX}${run}`,
    tenantId: null,
    userIds: [],
    email: `e2e-ui-owner-${run}@test.local`,
    password: 'TestPass123!',
  };
  writeState(state);

  const client = await connect();
  try {
    const { userId } = await createTenant(
      client,
      { name: `E2E UI Store ${run}`, slug: state.slug, email: state.email, password: state.password },
      (tenantId) => {
        state.tenantId = tenantId;
        writeState(state);
      },
    );
    state.userIds.push(userId);
    writeState(state);

    const api = await Api.login(state.email, state.password);
    state.token = api.token!;

    const init = await api.post('/settings/initialize');
    state.registerId = init.register.id;
    state.branchId = init.register.branchId;
    state.locationId = init.location.id;

    // HTG accepted at 132.5 per USD; purchase orders below 100k approve themselves
    await api.patch('/settings', {
      storeName: `E2E UI Store ${run}`,
      exchangeRates: { HTG: 132.5 },
      purchaseApprovalThreshold: 100000,
    });

    const context = await api.get('/pos/context');
    state.cashMethodId = (context.paymentMethods as { id: string; code: string }[]).find(
      (m) => m.code === 'CASH',
    )!.id;
    writeState(state);

    // Sign in through the login page once; every test reuses the saved session
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ baseURL });
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(state.email);
      await page.getByLabel('Password').fill(state.password);
      // The backend restarts in watch mode: a sign-in during a restart fails with a
      // network error (shown as "Invalid credentials"), so try a few times
      for (let attempt = 1; ; attempt++) {
        await page.getByRole('button', { name: 'Sign in' }).click();
        try {
          await page.waitForURL('**/pos', { timeout: 20_000 });
          break;
        } catch (error) {
          if (attempt >= 5) {
            await page.screenshot({ path: `${STORAGE_STATE}.login-failure.png` });
            console.error('[e2e] login page:', page.url(), await page.locator('body').innerText());
            throw error;
          }
          await api.get('/health').catch(() => undefined);
        }
      }
      await page.getByLabel('Register', { exact: true }).waitFor({ timeout: 60_000 });
      await page.context().storageState({ path: STORAGE_STATE });
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (state.tenantId) {
      try {
        await deleteTenant(client, state.tenantId, state.userIds);
        state.tenantId = null;
        writeState(state);
      } catch (cleanupError) {
        console.error('[e2e] cleanup after failed setup also failed:', cleanupError);
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}
