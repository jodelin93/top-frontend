import { describe, expect, it } from 'vitest';
import type { Discount } from '@/lib/api/discounts';
import { revalidateCart, type CurrentLine, type RevalidationInput, type RevalidationLine } from './cart-revalidation';

const line = (overrides: Partial<RevalidationLine> = {}): RevalidationLine => ({
  key: 'l1',
  variantId: 'v1',
  productId: 'p1',
  categoryId: 'c1',
  productName: 'Coffee',
  variantName: null,
  quantity: 2,
  unitPrice: 10,
  catalogPrice: 10,
  discountPercent: 0,
  taxRate: null,
  stockTracked: true,
  ...overrides,
});

const promo = (overrides: Partial<Discount> = {}): Discount => ({
  id: 'd1',
  code: 'COFFEE10',
  name: { en: 'Coffee 10%' },
  description: null,
  discountType: 'percentage',
  scope: 'product',
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
  applicableProductIds: ['p1'],
  applicableCategoryIds: [],
  excludedProductIds: [],
  priority: 0,
  status: 'active',
  ...overrides,
});

const check = (
  current: Record<string, CurrentLine>,
  overrides: Partial<RevalidationInput<Discount>> = {}
) =>
  revalidateCart<Discount>({
    lines: [line()],
    discount: null,
    cartDiscount: null,
    tax: { taxRate: 10, pricesIncludeTax: false },
    current: new Map(Object.entries(current)),
    ...overrides,
  });

describe('revalidateCart', () => {
  it('reports no change when prices, tax, promotions and stock are the same (no dialog)', () => {
    const result = check({ l1: { price: 10, taxRate: 10, available: 5 } });
    expect(result.changed).toBe(false);
    expect(result.lines).toEqual([]);
    expect(result.blocking).toBe(false);
    expect(result.totalBefore).toBe(22);
    expect(result.totalAfter).toBe(22);
    expect(result.difference).toBe(0);
  });

  it('reports a price increase with the before/after totals', () => {
    const result = check({ l1: { price: 12 } });
    expect(result.changed).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      key: 'l1',
      reasons: ['price'],
      before: { unitPrice: 10, total: 22 },
      after: { unitPrice: 12, total: 26.4 },
      blocking: false,
    });
    expect(result.totalBefore).toBe(22);
    expect(result.totalAfter).toBe(26.4);
    expect(result.difference).toBe(4.4);
    expect(result.apply.catalogPrices.get('l1')).toBe(12);
  });

  it('reports a price decrease', () => {
    const result = check({ l1: { price: 8 } });
    expect(result.lines[0].reasons).toEqual(['price']);
    expect(result.difference).toBe(-4.4);
  });

  it('keeps a price the cashier overrode (no price change)', () => {
    const result = check({ l1: { price: 12 } }, { lines: [line({ unitPrice: 9, catalogPrice: 10 })] });
    expect(result.changed).toBe(false);
    expect(result.apply.catalogPrices.get('l1')).toBe(12);
  });

  it('reports a tax rate change', () => {
    const result = check({ l1: { price: 10, taxRate: 15 } });
    expect(result.lines[0]).toMatchObject({
      reasons: ['tax'],
      before: { taxRate: 10, total: 22 },
      after: { taxRate: 15, total: 23 },
    });
    expect(result.difference).toBe(1);
    expect(result.apply.taxRates.get('l1')).toBe(15);
  });

  it('reports a promotion that no longer applies (discount code no longer valid)', () => {
    const result = check({ l1: { price: 10 } }, { discount: promo(), currentDiscount: null });
    expect(result.discountCodeLost).toBe('COFFEE10');
    expect(result.lines[0].reasons).toEqual(['promotion_lost']);
    // 20 - 10% = 18 + tax 1.80 → 22 without it
    expect(result.totalBefore).toBe(19.8);
    expect(result.totalAfter).toBe(22);
    expect(result.apply.discount).toBeNull();
  });

  it('reports a promotion that stops applying when its minimum is no longer met', () => {
    const result = check({ l1: { price: 8 } }, { discount: promo({ scope: 'cart', minPurchaseAmount: 18 }) });
    expect(result.discountCodeLost).toBeNull();
    expect(result.lines[0].reasons).toEqual(['price', 'promotion_lost']);
  });

  it('reports a promotion that now applies', () => {
    const result = check({ l1: { price: 10 } }, { discount: promo({ applicableProductIds: ['other'] }), currentDiscount: promo() });
    expect(result.lines[0].reasons).toEqual(['promotion_gained']);
    expect(result.difference).toBe(-2.2);
  });

  it('blocks on stock that is now insufficient, counting every line of the variant', () => {
    const result = check(
      { l1: { price: 10, available: 3 }, l2: { price: 10, available: 3 } },
      { lines: [line(), line({ key: 'l2', quantity: 2 })] }
    );
    expect(result.changed).toBe(true);
    expect(result.blocking).toBe(true);
    expect(result.lines.map((l) => [l.key, l.reasons, l.available])).toEqual([
      ['l1', ['stock'], 3],
      ['l2', ['stock'], 3],
    ]);
  });

  it('does not limit services', () => {
    const result = check({ l1: { price: 10, available: 0 } }, { lines: [line({ stockTracked: false })] });
    expect(result.changed).toBe(false);
  });

  it('blocks on an item that is no longer sold and leaves it out of the new total', () => {
    const result = check(
      { l1: { price: null }, l2: { price: 4 } },
      { lines: [line(), line({ key: 'l2', variantId: 'v2', productId: 'p2', quantity: 1, unitPrice: 4, catalogPrice: 4 })] }
    );
    expect(result.blocking).toBe(true);
    expect(result.lines).toEqual([
      expect.objectContaining({ key: 'l1', reasons: ['unsellable'], after: null, blocking: true }),
    ]);
    expect(result.totalAfter).toBe(4.4);
    expect(result.apply.catalogPrices.has('l1')).toBe(false);
  });

  it('uses the server quote as the new total and the held total as the old one', () => {
    const result = check(
      { l1: { price: 12, taxRate: 10 } },
      {
        heldTotal: 21.5,
        quote: { total: 26.4, lines: new Map([['l1', { unitPrice: 12, taxRate: 10, total: 26.4 }]]) },
      }
    );
    expect(result.totalBefore).toBe(21.5);
    expect(result.totalAfter).toBe(26.4);
    expect(result.difference).toBe(4.9);
  });

  it('never lets a total change go unnoticed, even without a changed line', () => {
    const result = check({ l1: { price: 10 } }, { heldTotal: 20 });
    expect(result.lines).toEqual([]);
    expect(result.changed).toBe(true);
  });
});
