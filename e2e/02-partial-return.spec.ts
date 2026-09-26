/**
 * Partial return through the till's Returns dialog: a cash sale of 3 units (made
 * through the API, with a shift open so cash can be refunded), 1 unit returned in
 * the UI, then the return and what is still returnable are checked through the API.
 */
import { expect, openPos, test, usd, type Product } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Partial return from the POS', () => {
  let product: Product;
  let registerId: string;
  let sale: { id: string; saleNumber: string };

  test.beforeAll(async ({ setup, api }) => {
    product = await setup.product('E2E Return Mug', 10);
    registerId = await setup.register('E2E Returns Till');
    // Cash refunds come out of the register's open shift
    await api.post('/shifts/open', { registerId, openingFloat: 50 });
    sale = await setup.cashSale(registerId, [{ variantId: product.variantId, quantity: 3 }], 30);
    expect(Number((sale as unknown as { total: number }).total)).toBe(30);
  });

  test('returns 1 of 3 units and refunds it in cash', async ({ page }) => {
    await openPos(page, registerId);
    await page.getByRole('button', { name: 'Returns', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'New return', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Receipt number').fill(sale.saleNumber);
    await dialog.getByRole('button', { name: 'Find sale' }).click();

    const quantity = dialog.getByLabel(`Quantity of ${product.name} to return`);
    await expect(quantity).toBeVisible();
    await quantity.fill('1');
    await dialog.getByLabel('Reason for the return').fill('E2E: changed mind');
    await expect(dialog.getByText('1 item(s) · refund about').locator('..')).toContainText(usd(10));
    await dialog.getByRole('button', { name: `Refund ${usd(10)}` }).click();

    await expect(page.getByRole('dialog', { name: 'Return complete', exact: true })).toBeVisible();
  });

  test('the server recorded a 10.00 refund and 2 units are still returnable', async ({ api }) => {
    const returns = await api.get(`/returns?saleId=${sale.id}`);
    const rows = (returns.data ?? returns) as { id: string; total: number; status: string }[];
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].total)).toBe(10);

    const lookup = await api.get(`/returns/lookup?saleNumber=${encodeURIComponent(sale.saleNumber)}`);
    const line = (lookup.lines as { variantId: string; quantitySold: number; quantityReturned: number; quantityReturnable: number }[]).find(
      (l) => l.variantId === product.variantId,
    );
    expect(line).toMatchObject({ quantitySold: 3, quantityReturned: 1, quantityReturnable: 2 });
  });
});
