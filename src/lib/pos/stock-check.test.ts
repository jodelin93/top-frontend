import { describe, expect, it } from 'vitest';
import { addBlockedBy, quantityBlockedBy, stockLimit, stockShortfalls, StockLine } from './stock-check';

const line = (overrides: Partial<StockLine> = {}): StockLine => ({
  key: 'l1',
  variantId: 'v1',
  quantity: 1,
  stock: 3,
  ...overrides,
});

describe('offline stock check', () => {
  it('has no limit for services or when the stock is unknown', () => {
    expect(stockLimit({ stock: 0, stockTracked: false })).toBeNull();
    expect(stockLimit({ stock: null })).toBeNull();
    expect(stockLimit({ stock: -2 })).toBe(0);
  });

  it('refuses to add a unit beyond the cached stock, counting every line of the variant', () => {
    const cart = [line({ quantity: 2 }), line({ key: 'l2', quantity: 1 })];
    expect(addBlockedBy(cart, { variantId: 'v1', stock: 3 })).toBe(3);
    expect(addBlockedBy(cart, { variantId: 'v1', stock: 4 })).toBeNull();
    expect(addBlockedBy([], { variantId: 'v1', stock: 0 })).toBe(0);
    // A service is never refused
    expect(addBlockedBy(cart, { variantId: 'v1', stock: 0, stockTracked: false })).toBeNull();
  });

  it('refuses a quantity above the stock but always allows lowering it', () => {
    const cart = [line({ quantity: 2 }), line({ key: 'l2', quantity: 1 })];
    expect(quantityBlockedBy(cart, 'l1', 3)).toBe(3);
    expect(quantityBlockedBy(cart, 'l1', 1)).toBeNull();
    expect(quantityBlockedBy([line({ quantity: 5, stock: 2 })], 'l1', 4)).toBeNull();
    expect(quantityBlockedBy([line({ stockTracked: false })], 'l1', 50)).toBeNull();
  });

  it('lists what exceeds the stock before an offline checkout', () => {
    const cart = [
      line({ quantity: 2 }),
      line({ key: 'l2', quantity: 2 }),
      line({ key: 'l3', variantId: 'svc', quantity: 9, stock: null, stockTracked: false }),
      line({ key: 'l4', variantId: 'v2', quantity: 1, stock: 1 }),
    ];
    expect(stockShortfalls(cart)).toEqual([{ variantId: 'v1', quantity: 4, limit: 3 }]);
  });
});
