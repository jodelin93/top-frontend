/**
 * Shared test fixtures: the run's store (from global-setup), an API client signed in
 * as its owner, and helpers that set up data through the API.
 */
import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { Api } from './support/api';
import { readState, type RunState } from './support/state';

let counter = 0;
/** Unique within the run: product SKUs, register codes... */
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`.toUpperCase();

export interface Product {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  price: number;
}

export class Setup {
  constructor(
    public api: Api,
    public store: RunState,
  ) {}

  /** A product with its price, stocked at the store's location */
  async product(name: string, price: number, stock = 50): Promise<Product> {
    const sku = uid('E2E');
    const product = await this.api.post('/products', { sku, name: { en: name }, price });
    const variantId = product.variants[0].id;
    if (stock > 0) {
      await this.api.post('/inventory/receive', {
        locationId: this.store.locationId,
        reference: 'E2E',
        items: [{ variantId, quantity: stock, cost: Math.round(price * 40) / 100 }],
      });
    }
    return { productId: product.id, variantId, sku, name, price };
  }

  /** A register of its own (shifts are per register), selling from the store's location */
  async register(name: string): Promise<string> {
    const register = await this.api.post('/registers', {
      branchId: this.store.branchId,
      code: uid('R').slice(0, 50),
      name,
      defaultLocationId: this.store.locationId,
    });
    return register.id;
  }

  /** A cash sale made through the API */
  async cashSale(registerId: string, items: { variantId: string; quantity: number }[], paid: number) {
    return this.api.post('/sales', {
      registerId,
      items,
      payments: [{ paymentMethodId: this.store.cashMethodId, amount: paid }],
      idempotencyKey: randomUUID(),
    });
  }
}

export const test = base.extend<{ store: RunState; api: Api; setup: Setup }>({
  store: async ({}, provide) => provide(readState()),
  api: async ({ store }, provide) => provide(new Api(store.token!)),
  setup: async ({ api, store }, provide) => provide(new Setup(api, store)),
});

export { expect };

/** Open the till on the given register and wait until it can sell */
export async function openPos(page: Page, registerId: string) {
  await page.goto('/pos');
  const register = page.getByLabel('Register', { exact: true });
  await expect(register).toBeVisible({ timeout: 60_000 });
  await register.selectOption(registerId);
  await expect(register).toHaveValue(registerId);
}

/** Money as the app shows it in English (en-US), e.g. "$20.00" or "HTG 350.00" */
export const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
