/**
 * Receiving part of a purchase order in Admin → Purchasing. The supplier and the order
 * (10 units) are created through the API and submitted (below the approval threshold
 * set by global-setup, so approved automatically) and issued; 4 units are received in
 * the UI, then received vs outstanding is checked through the API.
 */
import { expect, test, type Product } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Partial goods receipt of a purchase order', () => {
  let product: Product;
  let order: { id: string; poNumber: string };

  test.beforeAll(async ({ setup, api, store }) => {
    product = await setup.product('E2E Purchased Box', 8, 0);
    const supplier = await api.post('/suppliers', { code: `SUP${Date.now().toString(36)}`, name: 'E2E Supplier' });
    order = await api.post('/purchase-orders', {
      supplierId: supplier.id,
      locationId: store.locationId,
      items: [{ variantId: product.variantId, quantityOrdered: 10, unitCost: 4 }],
    });
    const submitted = await api.post(`/purchase-orders/${order.id}/submit`);
    expect(submitted.status).toBe('approved');
    const issued = await api.post(`/purchase-orders/${order.id}/issue`);
    expect(issued.status).toBe('issued');
  });

  test('receives 4 of 10 units in the purchasing screen', async ({ page }) => {
    await page.goto('/admin/purchasing');
    await expect(page.getByRole('tab', { name: 'Purchase orders' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('cell', { name: order.poNumber, exact: true }).click();

    const dialog = page.getByRole('dialog', { name: new RegExp(`^Purchase order ${order.poNumber}\\b`) });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Receive goods' }).click();

    const received = dialog.getByLabel(`Received quantity for ${product.sku}`);
    // Everything outstanding is proposed; this delivery only brought 4
    await expect(received).toHaveValue('10');
    await received.fill('4');
    await dialog.getByLabel('Delivery note / invoice number').fill('DN-E2E-1');
    await dialog.getByRole('button', { name: 'Receive', exact: true }).click();

    await expect(dialog.getByText(/^Received as .+\. Stock was added at the order's location\.$/)).toBeVisible();
    // The order now shows 10 ordered, 4 received
    const row = dialog.getByRole('row').filter({ hasText: product.sku });
    await expect(row.getByRole('cell').nth(1)).toHaveText('10');
    await expect(row.getByRole('cell').nth(2)).toHaveText('4');
    // Still open for the rest
    await expect(dialog.getByRole('button', { name: 'Receive goods' })).toBeVisible();
  });

  test('the server shows 4 received and 6 outstanding, with 4 in stock', async ({ api, store }) => {
    const detail = await api.get(`/purchase-orders/${order.id}`);
    expect(detail.status).toBe('partially_received');
    expect(detail.items).toHaveLength(1);
    const item = detail.items[0];
    expect(Number(item.quantityOrdered)).toBe(10);
    expect(Number(item.quantityReceived)).toBe(4);
    const outstanding = Number(item.quantityOrdered) - Number(item.quantityReceived) - Number(item.quantityCancelled ?? 0);
    expect(outstanding).toBe(6);

    const receipts = await api.get(`/goods-receipts?purchaseOrderId=${order.id}`);
    const rows = (receipts.data ?? receipts) as { reference: string | null }[];
    expect(rows.filter((r) => r.reference === 'DN-E2E-1')).toHaveLength(1);

    // Stock arrived at the order's location
    const catalog = await api.get(`/pos/catalog?registerId=${store.registerId}&search=${encodeURIComponent(product.sku)}`);
    const items = (catalog.data ?? catalog) as { variantId: string; stock: number }[];
    expect(Number(items.find((i) => i.variantId === product.variantId)?.stock)).toBe(4);
  });
});
