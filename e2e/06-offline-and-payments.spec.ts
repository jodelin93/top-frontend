/**
 * The till without a connection (context.setOffline): the product grid and the name
 * search work from the cached catalog, the sale is queued on the device, the offline
 * list shows it waiting, the "time left offline" notice shows, and once back online
 * the sale uploads. Then two sales in a row: the payment window of the second sale
 * starts empty, in the sale currency.
 */
import { expect, openPos, test, usd, type Product } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('POS offline and consecutive payments', () => {
  let product: Product;
  let offlineRegisterId: string;
  let registerId: string;

  test.beforeAll(async ({ setup }) => {
    product = await setup.product('E2E Offline Mango', 4);
    offlineRegisterId = await setup.register('E2E Offline Till');
    registerId = await setup.register('E2E Payments Till');
  });

  test('sells offline from the cached catalog and uploads the sale once back online', async ({ page, context, api }) => {
    // The offline lease this till gets for the register (allows selling offline)
    const leased = page.waitForResponse(
      (r) => /\/devices\/[^/]+\/lease$/.test(r.url()) && (r.request().postData() ?? '').includes(offlineRegisterId),
    );
    await openPos(page, offlineRegisterId);
    const lease = await leased;
    expect(lease.status(), await lease.text()).toBe(200);
    // Online first: the catalog is cached and the till gets its offline lease
    const tile = page.getByRole('button', { name: `Add ${product.name}, ${usd(4)}` });
    await page.getByLabel('Search products or scan a barcode').fill(product.name);
    await expect(tile).toBeVisible();
    await page.getByLabel('Search products or scan a barcode').fill('');
    await expect(page.getByRole('button', { name: /^Online/ })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByRole('button', { name: /^Offline/ })).toBeVisible();
    await expect(page.getByText(/Offline: you can keep selling until/)).toBeVisible();

    // Name search on the cached catalog
    await page.getByLabel('Search products or scan a barcode').fill(product.name.slice(4, 15));
    await expect(tile).toBeVisible();
    await tile.click();
    const cart = page.getByRole('complementary', { name: 'Cart' });
    await cart.getByRole('button', { name: `Charge ${usd(4)}` }).click();

    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    await payment.getByRole('button', { name: 'Cash', exact: true }).click();
    await payment.getByRole('button', { name: 'Add', exact: true }).click();
    await payment.getByRole('button', { name: /^Complete sale/ }).click();
    const receipt = page.getByRole('dialog', { name: 'Sale complete', exact: true });
    await expect(receipt).toBeVisible();
    await receipt.getByRole('button', { name: 'New sale' }).click();

    // The offline list shows the queued sale
    await page.getByRole('button', { name: /^Offline, 1 sale waiting to upload/ }).click();
    const list = page.getByRole('dialog', { name: 'Offline sales', exact: true });
    await expect(list.getByText('Waiting to upload')).toBeVisible();
    await expect(list.getByText('All sales are uploaded.')).toBeHidden();
    await page.keyboard.press('Escape');

    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Online', exact: true })).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(async () => (await api.get(`/sales?registerId=${offlineRegisterId}&limit=10`)).meta.total, {
        timeout: 60_000,
      })
      .toBe(1);
  });

  test('the next sale opens a fresh payment window', async ({ page }) => {
    await openPos(page, registerId);
    const cart = page.getByRole('complementary', { name: 'Cart' });
    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    const tile = page.getByRole('button', { name: `Add ${product.name}, ${usd(4)}` });

    // First sale: paid in HTG cash
    await page.getByLabel('Search products or scan a barcode').fill(product.name);
    await tile.click();
    await cart.getByRole('button', { name: `Charge ${usd(4)}` }).click();
    await payment.getByRole('radiogroup', { name: 'Customer pays in' }).getByRole('radio', { name: 'HTG' }).click();
    await payment.getByRole('button', { name: 'Cash', exact: true }).click();
    await payment.getByRole('button', { name: 'Add', exact: true }).click();
    await payment.getByRole('button', { name: /^Complete sale/ }).click();
    const receipt = page.getByRole('dialog', { name: 'Sale complete', exact: true });
    await receipt.getByRole('button', { name: 'New sale' }).click();
    await expect(receipt).toBeHidden();

    // Second sale: nothing carried over from the first one
    await page.getByLabel('Search products or scan a barcode').fill(product.name);
    await tile.click();
    await cart.getByRole('button', { name: `Charge ${usd(4)}` }).click();
    await expect(payment).toBeVisible();
    await expect(payment.getByRole('button', { name: 'Remove payment' })).toHaveCount(0);
    await expect(payment.getByText('Received', { exact: true }).locator('..')).toContainText(usd(0));
    await expect(payment.getByRole('radio', { name: 'USD' })).toBeChecked();
    await expect(payment.getByRole('button', { name: /^Complete sale/ })).toBeDisabled();
  });
});
