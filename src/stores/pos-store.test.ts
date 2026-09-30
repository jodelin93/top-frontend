import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogItem } from '@/lib/api/sales';
import type { Discount } from '@/lib/api/discounts';
import { computeTotals, groupDiscountPercentOf, usePOSStore } from './pos-store';

const item = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  variantId: 'v1',
  productId: 'p1',
  categoryId: 'c1',
  productName: 'Coffee',
  variantName: null,
  sku: 'COF-1',
  barcode: null,
  price: 10,
  stock: 5,
  imageUrl: null,
  ...overrides,
});

const store = () => usePOSStore.getState();

beforeEach(() => {
  localStorage.clear();
  usePOSStore.setState(usePOSStore.getInitialState(), true);
});

describe('usePOSStore', () => {
  it('adds a new line, then merges re-scans of the same variant into it', () => {
    store().addItem(item());
    store().addItem(item());
    store().addItem(item({ variantId: 'v2', productName: 'Tea', price: 4 }));

    expect(store().cart).toHaveLength(2);
    expect(store().cart[0]).toMatchObject({ variantId: 'v1', quantity: 2, unitPrice: 10, discountPercent: 0 });
    expect(store().cart[1]).toMatchObject({ variantId: 'v2', quantity: 1, unitPrice: 4 });
  });

  it('adds to the line of the same product even when it has a discount or a changed price', () => {
    store().addItem(item());
    store().setLineDiscount(store().cart[0].key, 10);
    store().addItem(item());

    expect(store().cart.map((l) => [l.quantity, l.discountPercent])).toEqual([[2, 10]]);

    store().addItem(item({ variantId: 'v2', productName: 'Tea', price: 4 }));
    store().setUnitPrice(store().cart[1].key, 3.5);
    store().addItem(item({ variantId: 'v2', productName: 'Tea', price: 4 }));

    expect(store().cart.map((l) => [l.variantId, l.quantity, l.unitPrice])).toEqual([
      ['v1', 2, 10],
      ['v2', 2, 3.5],
    ]);
  });

  it('updates quantity and removes the line when quantity is set to 0', () => {
    store().addItem(item());
    const { key } = store().cart[0];

    store().setQuantity(key, 3);
    expect(store().cart[0].quantity).toBe(3);

    store().setQuantity(key, 0);
    expect(store().cart).toEqual([]);
  });

  it('clamps the line discount to 0–100', () => {
    store().addItem(item());
    const { key } = store().cart[0];

    store().setLineDiscount(key, 150);
    expect(store().cart[0].discountPercent).toBe(100);

    store().setLineDiscount(key, -5);
    expect(store().cart[0].discountPercent).toBe(0);

    store().setLineDiscount(key, 12.5);
    expect(store().cart[0].discountPercent).toBe(12.5);
  });

  it('clearCart resets the cart, customer, discounts and notes but keeps the register', () => {
    store().setRegister('reg-1');
    store().addItem(item());
    store().setCustomer({ id: 'cust-1', name: 'Ada', loyaltyPoints: 0 });
    store().setCartDiscount({ type: 'percentage', value: 5 });
    store().setNotes('gift wrap');

    store().clearCart();

    expect(store()).toMatchObject({
      registerId: 'reg-1',
      cart: [],
      customer: null,
      discount: null,
      cartDiscount: null,
      notes: '',
    });
  });
});

describe('computeTotals', () => {
  it('computes totals for the cart with line and cart discounts', () => {
    store().addItem(item({ price: 10 }));
    store().addItem(item({ price: 10 })); // 2 × 10
    store().addItem(item({ variantId: 'v2', productId: 'p2', price: 30 }));
    store().setLineDiscount(store().cart[1].key, 50); // 30 → 15
    store().setCartDiscount({ type: 'fixed', value: 5 });

    const totals = computeTotals(store(), { taxRate: 10, pricesIncludeTax: false });

    // Net before cart discount: 20 + 15 = 35; −5 → 30; +10% tax → 33
    expect(totals).toMatchObject({ subtotal: 50, discountAmount: 20, taxAmount: 3, total: 33 });
    expect(totals.lines.map((l) => l.key)).toEqual(store().cart.map((l) => l.key));
  });

  it('applies a validated discount code kept in the store', () => {
    const discount: Discount = {
      id: 'd1',
      code: 'COFFEE10',
      name: { en: '10% off coffee' },
      description: null,
      discountType: 'percentage',
      scope: 'category',
      value: null,
      percentage: 10,
      buyQuantity: null,
      getQuantity: null,
      minPurchaseAmount: null,
      maxDiscountAmount: null,
      usageLimit: null,
      usageCount: 0,
      validFrom: null,
      validTo: null,
      applicableProductIds: [],
      applicableCategoryIds: ['c1'],
      excludedProductIds: [],
      priority: 0,
      status: 'active',
    };
    store().addItem(item({ price: 20 })); // category c1
    store().addItem(item({ variantId: 'v2', productId: 'p2', categoryId: 'c2', price: 10 }));
    store().setDiscount(discount);

    const totals = computeTotals(store(), { taxRate: 0, pricesIncludeTax: true });

    expect(totals.lines.map((l) => l.discountAmount)).toEqual([2, 0]);
    expect(totals.total).toBe(28);
  });

  it('returns zeros for an empty cart', () => {
    expect(computeTotals(store(), { taxRate: 10, pricesIncludeTax: false })).toMatchObject({
      lines: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
    });
  });
});

describe('price overrides, held carts and per-product tax', () => {
  it('overrides a line price, keeps it on re-price and restores the catalog price', () => {
    store().addItem(item());
    const { key } = store().cart[0];
    store().setUnitPrice(key, 7.555);
    expect(store().cart[0]).toMatchObject({ unitPrice: 7.56, catalogPrice: 10 });

    // Server re-price after a quote: the override stays, the catalog price moves
    store().updatePrices(new Map([['v1', 11]]));
    expect(store().cart[0]).toMatchObject({ unitPrice: 7.56, catalogPrice: 11 });

    store().setUnitPrice(key, null);
    expect(store().cart[0].unitPrice).toBe(11);
  });

  it('merges a scan into an overridden line, keeping its price', () => {
    store().addItem(item());
    store().setUnitPrice(store().cart[0].key, 5);
    store().addItem(item());
    expect(store().cart.map((l) => [l.quantity, l.unitPrice])).toEqual([[2, 5]]);
  });

  it('loads a resumed held cart and forgets it when cleared', () => {
    store().addItem(item({ variantId: 'other' }));
    store().loadCart(
      {
        heldSaleId: 'held-1',
        customerId: null,
        discountCode: null,
        cartDiscount: { type: 'percentage', value: 5 },
        priceListId: null,
        notes: 'table 4',
        items: [
          {
            variantId: 'v1',
            productId: 'p1',
            categoryId: null,
            productName: 'Coffee',
            variantName: null,
            sku: 'COF-1',
            quantity: 3,
            unitPrice: 9,
            catalogPrice: 10,
            discountPercent: 0,
            taxRate: 5,
            stock: 4,
          },
        ],
      },
      { customer: null, discount: null }
    );
    expect(store().heldSaleId).toBe('held-1');
    expect(store().cart).toHaveLength(1);
    expect(store().cart[0]).toMatchObject({ variantId: 'v1', quantity: 3, unitPrice: 9, taxRate: 5 });
    expect(store().cartDiscount).toEqual({ type: 'percentage', value: 5 });

    store().clearCart();
    expect(store().heldSaleId).toBeNull();
  });

  it('computes tax per line with each product’s rate', () => {
    store().addItem(item({ price: 100, taxRate: 0 }));
    store().addItem(item({ variantId: 'v2', price: 100, taxRate: 5 }));
    store().addItem(item({ variantId: 'v3', price: 100 }));
    const totals = computeTotals(store(), { taxRate: 10, pricesIncludeTax: false });
    expect(totals.taxAmount).toBe(15);
    expect(totals.total).toBe(315);
  });
});


describe('usePOSStore — services, notes and salesperson', () => {
  it('keeps no stock count for a service', () => {
    store().addItem(item({ stock: 0, stockTracked: false }));
    expect(store().cart[0]).toMatchObject({ stock: null, stockTracked: false });
  });

  it('stores a line note and discount reason, and forgets the salesperson with the cart', () => {
    store().addItem(item());
    const { key } = store().cart[0];
    store().setLineNote(key, 'Gift wrapped');
    store().setLineDiscountReason(key, 'Damaged box');
    store().setSalesperson('u2');
    expect(store().cart[0]).toMatchObject({ note: 'Gift wrapped', discountReason: 'Damaged box' });
    expect(store().salespersonId).toBe('u2');
    store().clearCart();
    expect(store().salespersonId).toBeNull();
  });
});

describe('usePOSStore: measured items (sold by weight)', () => {
  const kg = { code: 'kg', allowsDecimals: true, precision: 3 };
  const apples = (overrides: Partial<CatalogItem> = {}) =>
    item({ variantId: 'apples', productName: 'Apples', price: 3.99, stock: 10, unit: kg, ...overrides });

  it('adds each weighing as its own line, never merging', () => {
    store().addItem(apples(), 1.25);
    store().addItem(apples(), 0.8);
    expect(store().cart).toHaveLength(2);
    expect(store().cart.map((l) => l.quantity)).toEqual([1.25, 0.8]);
    expect(store().cart[0].unit).toEqual(kg);
  });

  it('still merges re-scans of items sold by the piece', () => {
    store().addItem(item());
    store().addItem(item());
    store().addItem(apples(), 0.5);
    expect(store().cart.map((l) => [l.variantId, l.quantity])).toEqual([
      ['v1', 2],
      ['apples', 0.5],
    ]);
  });

  it('keeps quantities to the unit precision', () => {
    store().addItem(apples(), 1.23456);
    expect(store().cart[0].quantity).toBe(1.235);
    store().setQuantity(store().cart[0].key, 0.1 + 0.2);
    expect(store().cart[0].quantity).toBe(0.3);
  });

  it('prices a weighed line exactly: 1.250 kg × 3.99 = 4.99', () => {
    store().addItem(apples(), 1.25);
    const totals = computeTotals(store(), { taxRate: 0, pricesIncludeTax: false });
    expect(totals.subtotal).toBe(4.99);
    expect(totals.total).toBe(4.99);
  });

  it('restores the unit of a resumed held cart', () => {
    store().loadCart(
      {
        heldSaleId: 'h1',
        customerId: null,
        discountCode: null,
        cartDiscount: null,
        priceListId: null,
        notes: '',
        items: [
          {
            variantId: 'apples',
            productId: 'p1',
            categoryId: null,
            productName: 'Apples',
            variantName: null,
            sku: 'APL',
            quantity: 1.25,
            unitPrice: 3.99,
            catalogPrice: 3.99,
            discountPercent: 0,
            taxRate: null,
            stock: 5,
            unit: kg,
          },
        ],
      },
      { customer: null, discount: null }
    );
    expect(store().cart[0]).toMatchObject({ quantity: 1.25, unit: kg });
  });
});

describe('computeTotals: customer group discount', () => {
  const trade = { id: 'g1', name: 'Trade', priceListId: null, discountPercent: 10 };

  it("takes the customer's group discount off and reports it apart", () => {
    store().addItem(item({ price: 20 }));
    store().setCustomer({ id: 'c1', name: 'Ann', loyaltyPoints: 0, group: trade });
    const totals = computeTotals(store(), { taxRate: 0, pricesIncludeTax: false });
    expect(totals).toMatchObject({ subtotal: 20, discountAmount: 2, groupDiscountAmount: 2, total: 18 });
  });

  it('reverts when the customer is removed, and never applies to an estimate', () => {
    store().addItem(item({ price: 20 }));
    store().setCustomer({ id: 'c1', name: 'Ann', loyaltyPoints: 0, group: trade });
    expect(groupDiscountPercentOf({ customer: store().customer, estimate: { id: 'e1', number: 'EST-1' } })).toBe(0);
    store().setCustomer(null);
    const totals = computeTotals(store(), { taxRate: 0, pricesIncludeTax: false });
    expect(totals.total).toBe(20);
    expect(totals.groupDiscountAmount).toBeUndefined();
  });
});
