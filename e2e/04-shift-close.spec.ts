/**
 * Shift at the till: opened in the UI with a 100.00 float, one 20.00 cash sale (API),
 * closed in the UI with a denomination count of 118.00 (2.00 short, inside the
 * default 5.00 tolerance). The closed shift's expected / counted / variance are then
 * checked through the API.
 */
import { expect, openPos, test, usd, type Product } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Shift open and close with a cash count', () => {
  let product: Product;
  let registerId: string;
  let shiftId: string;
  let shiftNumber: string;

  test.beforeAll(async ({ setup }) => {
    product = await setup.product('E2E Shift Snack', 10);
    registerId = await setup.register('E2E Shift Till');
  });

  test('opens a shift with a 100.00 float', async ({ page, api }) => {
    await openPos(page, registerId);
    await page.getByRole('banner').getByRole('button', { name: 'Open shift' }).click();

    const dialog = page.getByRole('dialog', { name: 'Open shift', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Enter total' }).click();
    await dialog.getByLabel('Opening float').fill('100');
    await expect(dialog.getByText('Float:').locator('strong')).toHaveText(usd(100));
    await dialog.getByRole('button', { name: 'Open shift', exact: true }).click();
    await expect(dialog).toBeHidden();

    const current = await api.get(`/shifts/current?registerId=${registerId}`);
    expect(current.shift).toBeTruthy();
    shiftId = current.shift.id;
    shiftNumber = current.shift.shiftNumber;
    expect(current.shift.status).toBe('open');
    expect(Number(current.shift.openingFloat)).toBe(100);
    await expect(page.getByRole('button', { name: `${shiftNumber} · Open` })).toBeVisible();
  });

  test('closes the shift with a count of 118.00', async ({ page, setup }) => {
    // A 20.00 cash sale during the shift: 120.00 expected in the drawer
    const sale = await setup.cashSale(registerId, [{ variantId: product.variantId, quantity: 2 }], 20);
    expect(sale.shiftId).toBe(shiftId);

    await openPos(page, registerId);
    await page.getByRole('button', { name: `${shiftNumber} · Open` }).click();
    const panel = page.getByRole('dialog', { name: `Shift ${shiftNumber}`, exact: true });
    await expect(panel.getByText('Expected in drawer').locator('..')).toContainText(usd(120));
    await panel.getByRole('button', { name: 'Close shift', exact: true }).click();

    const close = page.getByRole('dialog', { name: `Close shift ${shiftNumber}`, exact: true });
    await expect(close).toBeVisible();
    await close.getByRole('button', { name: 'Start count' }).click();

    // 1 × 100 + 1 × 10 + 1 × 5 + 3 × 1 = 118.00
    await close.getByLabel(`Number of ${usd(100)}`, { exact: true }).fill('1');
    await close.getByLabel(`Number of ${usd(10)}`, { exact: true }).fill('1');
    await close.getByLabel(`Number of ${usd(5)}`, { exact: true }).fill('1');
    await close.getByLabel(`Number of ${usd(1)}`, { exact: true }).fill('3');
    await expect(close.getByText('Counted total').locator('..')).toContainText(usd(118));
    await close.getByRole('button', { name: 'Review count' }).click();

    await expect(close.getByText('Counted', { exact: true }).locator('..')).toContainText(usd(118));
    await expect(close.getByText('Expected', { exact: true }).locator('..')).toContainText(usd(120));
    await expect(close.getByText('Variance', { exact: true }).first().locator('..')).toContainText(`-${usd(2)}`);
    await expect(close.getByText(`Within the ${usd(5)} tolerance.`)).toBeVisible();
    await close.getByRole('button', { name: 'Close shift', exact: true }).click();

    await expect(page.getByRole('dialog', { name: 'Shift closed', exact: true })).toBeVisible();
    await page.getByRole('dialog', { name: 'Shift closed', exact: true }).getByRole('button', { name: 'Done' }).click();
    // No shift on the register any more
    await expect(page.getByRole('banner').getByRole('button', { name: 'Open shift' })).toBeVisible();
  });

  test('the server shows the shift closed with expected 120, counted 118, variance -2', async ({ api }) => {
    const shift = await api.get(`/shifts/${shiftId}`);
    expect(shift.status).toBe('closed');
    expect(Number(shift.openingFloat)).toBe(100);
    expect(Number(shift.expectedCash)).toBe(120);
    expect(Number(shift.countedCash)).toBe(118);
    expect(Number(shift.variance)).toBe(-2);
    expect(shift.closedAt).toBeTruthy();
  });
});
