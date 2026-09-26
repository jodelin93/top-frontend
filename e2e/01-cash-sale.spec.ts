/**
 * Cashier cash sales at the till: one paid in USD with change, one paid in HTG with
 * the change handed back in HTG (store rate 1 USD = 132.5 HTG, set by global-setup).
 * The sales the server recorded are then checked through the API.
 */
import { expect, openPos, test, usd, type Product } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('POS cash sale with change', () => {
  let product: Product;
  let registerId: string;

  test.beforeAll(async ({ setup }) => {
    product = await setup.product('E2E Cash Widget', 10);
    registerId = await setup.register('E2E Cash Till');
  });

  const addTwoToCart = async (page: import('@playwright/test').Page) => {
    await page.getByLabel('Search products or scan a barcode').fill(product.name);
    const tile = page.getByRole('button', { name: `Add ${product.name}, ${usd(10)}` });
    await tile.click();
    await tile.click();
    await expect(page.getByRole('textbox', { name: `Quantity of ${product.name}`, exact: true })).toHaveValue('2');
    const cart = page.getByRole('complementary', { name: 'Cart' });
    await expect(cart.getByText('Total', { exact: true }).locator('..')).toContainText(usd(20));
    // HTG is accepted: the cart also shows the total in HTG (20 × 132.5)
    await expect(cart.getByText('≈ in HTG').locator('..')).toContainText(/HTG\s*2,650\.00/);
    return cart;
  };

  test('pays in USD cash and shows the change', async ({ page }) => {
    await openPos(page, registerId);
    const cart = await addTwoToCart(page);
    await cart.getByRole('button', { name: `Charge ${usd(20)}` }).click();

    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    await expect(payment).toBeVisible();
    await payment.getByRole('button', { name: 'Cash', exact: true }).click();
    const amount = payment.getByLabel('Amount in USD');
    await expect(amount).toHaveValue('20.00');
    await amount.fill('50');
    await payment.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(payment.getByText('Change', { exact: true }).locator('..')).toContainText(usd(30));
    await payment.getByRole('button', { name: `Complete sale · give ${usd(30)} change` }).click();

    const receipt = page.getByRole('dialog', { name: 'Sale complete', exact: true });
    await expect(receipt).toBeVisible();
    await expect(receipt.getByTestId('change-due')).toHaveText(usd(30));
    await receipt.getByRole('button', { name: 'New sale' }).click();
    await expect(receipt).toBeHidden();
  });

  test('pays in HTG cash and gives the change in HTG', async ({ page }) => {
    await openPos(page, registerId);
    const cart = await addTwoToCart(page);
    await cart.getByRole('button', { name: `Charge ${usd(20)}` }).click();

    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    await expect(payment).toBeVisible();
    await payment.getByRole('radiogroup', { name: 'Customer pays in' }).getByRole('radio', { name: 'HTG' }).click();
    await payment.getByRole('button', { name: 'Cash', exact: true }).click();
    const amount = payment.getByLabel('Amount in HTG');
    // 20 USD × 132.5, rounded up
    await expect(amount).toHaveValue('2650.00');
    await amount.fill('3000');
    await payment.getByRole('button', { name: 'Add', exact: true }).click();

    // 3000 HTG = 22.64 USD: 2.64 USD or 350.00 HTG back; the cashier hands back HTG
    const giveBack = payment.getByRole('status').filter({ hasText: 'Give back to the customer' });
    await expect(giveBack).toContainText(usd(2.64));
    await giveBack.getByRole('button', { name: /HTG/ }).click();
    await expect(giveBack.getByRole('button', { name: /HTG/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(payment.getByText('Change', { exact: true }).locator('..')).toContainText(/HTG\s*350\.00/);
    await payment.getByRole('button', { name: /^Complete sale · give HTG\s*350\.00 change$/ }).click();

    const receipt = page.getByRole('dialog', { name: 'Sale complete', exact: true });
    await expect(receipt).toBeVisible();
    await expect(receipt.getByTestId('change-due')).toHaveText(/HTG\s*350\.00/);
    await receipt.getByRole('button', { name: 'New sale' }).click();
  });

  test('the server recorded both sales with the right totals and change', async ({ api }) => {
    const list = await api.get(`/sales?registerId=${registerId}&limit=10`);
    expect(list.meta.total).toBe(2);
    const sales = await Promise.all(
      (list.data as { id: string }[]).map((s) => api.get(`/sales/${s.id}`)),
    );
    for (const sale of sales) {
      expect(sale.status).toBe('completed');
      expect(Number(sale.total)).toBe(20);
      expect(sale.items).toHaveLength(1);
      expect(Number(sale.items[0].quantity)).toBe(2);
    }

    const usdSale = sales.find((s) => !s.payments.some((p: { tenderedCurrency?: string }) => p.tenderedCurrency));
    const htgSale = sales.find((s) => s.payments.some((p: { tenderedCurrency?: string }) => p.tenderedCurrency === 'HTG'));
    expect(usdSale, 'sale paid in USD').toBeDefined();
    expect(htgSale, 'sale paid in HTG').toBeDefined();

    expect(Number(usdSale.amountPaid)).toBe(50);
    expect(Number(usdSale.changeAmount)).toBe(30);

    expect(htgSale.payments).toHaveLength(1);
    expect(Number(htgSale.payments[0].tenderedAmount)).toBe(3000);
    expect(Number(htgSale.payments[0].amount)).toBe(22.64);
    expect(Number(htgSale.changeAmount)).toBe(2.64);
    expect(htgSale.metadata?.changeTender).toMatchObject({ currencyCode: 'HTG', amount: 350 });
  });
});
