/**
 * The till on a small Android phone (360 px wide): products and cart are two views,
 * the secondary header actions sit in the "more" menu, dialogs are full screen, and
 * nothing ever scrolls the page sideways. A cash sale paid in HTG goes through end to end.
 */
import { expect, openPos, test, usd, type Product } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
test.describe.configure({ mode: 'serial' });

/** The page never scrolls horizontally, and no open dialog is wider than the screen */
async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.scrollWidth - d.clientWidth),
  }));
  expect(sizes.page, 'page scroll width').toBeLessThanOrEqual(sizes.viewport);
  for (const extra of sizes.dialogs) expect(extra, 'dialog scrolls sideways').toBeLessThanOrEqual(0);
}

test.describe('POS on a 360 px phone', () => {
  let product: Product;
  let registerId: string;

  test.beforeAll(async ({ setup }) => {
    product = await setup.product('E2E Phone Widget', 10);
    registerId = await setup.register('E2E Phone Till');
  });

  test('sells in two views with a cash payment in HTG, without sideways scrolling', async ({ page, api }) => {
    await openPos(page, registerId);
    await expectNoHorizontalOverflow(page);

    // Compact header: secondary actions are in the "more" menu
    await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeHidden();

    // Products view: the cart panel is out of the way, the bottom bar sums it up
    const cart = page.getByRole('complementary', { name: 'Cart' });
    await expect(cart).toBeHidden();
    await page.getByLabel('Search products or scan a barcode').fill(product.name);
    const tile = page.getByRole('button', { name: `Add ${product.name}, ${usd(10)}` });
    await tile.click();
    await tile.click();
    await expect(page.getByRole('tab', { name: 'Cart (2)' })).toBeVisible();
    await expect(page.getByRole('button', { name: `View cart: 2 items, ${usd(20)}` })).toBeVisible();
    await expect(cart).toBeHidden();
    await expectNoHorizontalOverflow(page);

    // Cart view: 44 px quantity buttons, totals and Charge fully on screen
    await page.getByRole('tab', { name: 'Cart (2)' }).click();
    await expect(cart).toBeVisible();
    const increase = cart.getByRole('button', { name: `Increase quantity of ${product.name}` });
    const box = await increase.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await increase.click();
    await expect(cart.getByRole('textbox', { name: `Quantity of ${product.name}`, exact: true })).toHaveValue('3');
    await expect(cart.getByText('Total', { exact: true }).locator('..')).toContainText(usd(30));
    const charge = cart.getByRole('button', { name: `Charge ${usd(30)}` });
    await expect(charge).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalOverflow(page);
    await charge.click();

    // Full-screen payment dialog, number pad for the amount
    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    await expect(payment).toBeVisible();
    const dialogBox = await payment.boundingBox();
    expect(dialogBox!.width).toBe(360);
    await payment.getByRole('radiogroup', { name: 'Customer pays in' }).getByRole('radio', { name: 'HTG' }).click();
    await payment.getByRole('button', { name: 'Cash', exact: true }).click();
    const amount = payment.getByLabel('Amount in HTG');
    await expect(amount).toHaveAttribute('inputmode', 'decimal');
    // 30 USD × 132.5
    await expect(amount).toHaveValue('3975.00');
    await amount.fill('4000');
    await payment.getByRole('button', { name: 'Add', exact: true }).click();
    const giveBack = payment.getByRole('status').filter({ hasText: 'Give back to the customer' });
    await giveBack.getByRole('button', { name: /HTG/ }).click();
    await expectNoHorizontalOverflow(page);
    const complete = payment.getByRole('button', { name: /^Complete sale · give HTG\s*25\.00 change$/ });
    await expect(complete).toBeInViewport();
    await complete.click();

    const receipt = page.getByRole('dialog', { name: 'Sale complete', exact: true });
    await expect(receipt).toBeVisible();
    await expect(receipt.getByTestId('change-due')).toHaveText(/HTG\s*25\.00/);
    await expectNoHorizontalOverflow(page);
    await receipt.getByRole('button', { name: 'New sale' }).click();
    await expect(receipt).toBeHidden();

    // Back on the products view with an empty cart
    await expect(page.getByRole('tab', { name: 'Cart (0)' })).toBeVisible();
    await expect(cart).toBeHidden();

    const sales = await api.get(`/sales?registerId=${registerId}&limit=10`);
    expect(sales.meta.total).toBe(1);
  });

  test('reaches held carts and returns from the "more" menu', async ({ page }) => {
    await openPos(page, registerId);

    await page.getByRole('button', { name: 'More actions' }).click();
    const menu = page.getByRole('dialog', { name: 'More actions' });
    await expect(menu).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await menu.getByRole('button', { name: 'Held carts' }).click();
    const held = page.getByRole('dialog', { name: 'Held carts' });
    await expect(held).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(held).toBeHidden();

    await page.getByRole('button', { name: 'More actions' }).click();
    await menu.getByRole('button', { name: 'Returns' }).click();
    const returns = page.getByRole('dialog', { name: 'New return' });
    await expect(returns).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
