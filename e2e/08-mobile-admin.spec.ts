/**
 * The admin area on a small Android phone (360 px wide): no page scrolls sideways,
 * the main lists are stacked cards instead of wide tables, and the sidebar is a
 * drawer opened from the top bar's menu button.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { readState } from './support/state';

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

const ROUTES = [
  '/admin/dashboard',
  '/admin/reports',
  '/admin/sales',
  '/admin/returns',
  '/admin/shifts',
  '/admin/expenses',
  '/admin/products',
  '/admin/categories',
  '/admin/inventory',
  '/admin/purchasing',
  '/admin/customers',
  '/admin/users',
  '/admin/roles',
  '/admin/settings',
  '/admin/audit',
  '/account/security',
];

/** How far the page is wider than the screen, in pixels (0 = no sideways scrolling) */
const horizontalOverflow = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    return Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main ? main.scrollWidth - main.clientWidth : 0,
    );
  });

test('admin pages fit a 360 px wide phone', async ({ page, setup }) => {
  // Something in the lists, so the wide tables are drawn
  await setup.product('Mobile Layout Product', 4.5, 5);

  for (const route of ROUTES) {
    await test.step(route, async () => {
      await page.goto(route);
      // Admin pages have a page title; the account page starts with its two-factor card
      const ready = route.startsWith('/admin')
        ? page.getByRole('main').getByRole('heading', { level: 1 }).first()
        : page.getByText('Two-factor authentication', { exact: true }).first();
      await expect(ready).toBeVisible({ timeout: 60_000 });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      expect(await horizontalOverflow(page), `${route} scrolls sideways`).toBeLessThanOrEqual(0);
    });
  }
});

/** Tables in the page (outside dialogs) whose content is wider than their box */
const sidewaysTables = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main table')]
      .map((table) => table.parentElement!)
      .filter((box) => box.scrollWidth > box.clientWidth + 1).length,
  );

test('the main lists are cards on phones, not sideways-scrolling tables', async ({ page, setup }) => {
  const product = await setup.product('Mobile Card Product', 3.25, 7);

  for (const [route, text] of [
    ['/admin/products', 'Mobile Card Product'],
    ['/admin/inventory', 'Mobile Card Product'],
    ['/admin/users', readState().email],
  ] as const) {
    await test.step(route, async () => {
      await page.goto(route);
      const cards = page.getByRole('main').getByTestId('data-cards').first();
      await expect(cards).toBeVisible({ timeout: 60_000 });
      await expect(cards.getByText(text).first()).toBeVisible();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      expect(await sidewaysTables(page), `${route} has a table scrolling sideways`).toBe(0);
    });
  }

  // A card's row actions work like the table's: Edit opens the product form
  await page.goto('/admin/products');
  const edit = page.getByRole('main').getByRole('button', { name: `Edit ${product.sku}` });
  await expect(edit).toBeVisible({ timeout: 60_000 });
  await edit.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('the desktop lists are still tables at 1440 px', async ({ page, setup }) => {
  await setup.product('Desktop Table Product', 3.25, 7);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/products');
  await expect(page.getByRole('main').getByRole('table')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('main').getByTestId('data-cards')).toHaveCount(0);
});

test('the admin menu is a drawer on phones', async ({ page }) => {
  await page.goto('/admin/products');
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  await expect(menuButton).toBeVisible({ timeout: 60_000 });

  // Closed: the sidebar is off screen
  const drawer = page.getByRole('complementary', { name: 'Admin menu' });
  await expect(drawer).toBeHidden();

  await menuButton.click();
  await expect(drawer).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  // The sidebar footer stays reachable
  await expect(drawer.getByRole('link', { name: 'Account security' })).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Back to POS' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // Navigating closes the drawer and shows the page's name in the top bar
  await drawer.getByRole('link', { name: 'Customers', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await expect(drawer).toBeHidden();
  await expect(page.getByRole('banner')).toContainText('Customers');

  // The close button and Escape close it too
  await menuButton.click();
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Close menu' }).click();
  await expect(drawer).toBeHidden();
  await menuButton.click();
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('the desktop sidebar is unchanged at 1440 px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/products');
  const sidebar = page.getByRole('complementary', { name: 'Admin menu' });
  await expect(sidebar).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  await expect(sidebar.getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
});
