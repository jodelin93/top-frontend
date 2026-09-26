import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateSale, type CalcLineInput } from './sale-calculator';

const FRONTEND_COPY = path.resolve(__dirname, 'sale-calculator.ts');
const BACKEND_SOURCE = path.resolve(__dirname, '../../../../top-backend/src/sales/sale-calculator.ts');

// The leading /** ... */ header legitimately differs between the two copies; everything
// after it must be byte-for-byte identical (the backend copy is Prettier-formatted, so
// re-copy it verbatim rather than editing the frontend file by hand).
const withoutHeader = (file: string): string =>
  readFileSync(file, 'utf8').replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');

describe('sale-calculator copy', () => {
  it('is identical to the backend calculator apart from the header comment', () => {
    expect(withoutHeader(FRONTEND_COPY)).toBe(withoutHeader(BACKEND_SOURCE));
  });
});

const line = (overrides: Partial<CalcLineInput> = {}): CalcLineInput => ({
  key: overrides.key ?? 'l1',
  productId: 'p1',
  categoryId: null,
  quantity: 1,
  unitPrice: 10,
  ...overrides,
});

describe('calculateSale', () => {
  it('adds tax on top when prices exclude tax', () => {
    const result = calculateSale([line({ quantity: 2, unitPrice: 10 })], {
      taxRate: 10,
      pricesIncludeTax: false,
    });
    expect(result).toMatchObject({ subtotal: 20, discountAmount: 0, taxAmount: 2, total: 22 });
  });

  it('extracts tax from the price when prices include tax', () => {
    const result = calculateSale([line({ unitPrice: 11 })], { taxRate: 10, pricesIncludeTax: true });
    expect(result).toMatchObject({ subtotal: 11, discountAmount: 0, taxAmount: 1, total: 11 });
  });

  it('spreads a cart percentage discount across lines in proportion to their value', () => {
    const result = calculateSale(
      [line({ key: 'a', unitPrice: 10 }), line({ key: 'b', productId: 'p2', unitPrice: 30 })],
      { taxRate: 0, pricesIncludeTax: false, cartDiscount: { type: 'percentage', value: 10 } }
    );
    expect(result.discountAmount).toBe(4);
    expect(result.lines.map((l) => l.discountAmount)).toEqual([1, 3]);
    expect(result.total).toBe(36);
  });

  it('applies a manual line percentage discount before tax', () => {
    const result = calculateSale([line({ unitPrice: 40, discountPercent: 25 })], {
      taxRate: 10,
      pricesIncludeTax: false,
    });
    expect(result).toMatchObject({ subtotal: 40, discountAmount: 10, taxAmount: 3, total: 33 });
  });

  it('clamps a line discount above 100% to the full line value', () => {
    const result = calculateSale([line({ unitPrice: 5, discountPercent: 150 })], {
      taxRate: 10,
      pricesIncludeTax: false,
    });
    expect(result).toMatchObject({ discountAmount: 5, taxAmount: 0, total: 0 });
  });
});

describe('calculateSale: measured quantities (same fixtures as the server)', () => {
  it('1.250 kg at 3.99 = 4.99 and 0.333 m at 12.00 = 4.00', () => {
    expect(calculateSale([line({ quantity: 1.25, unitPrice: 3.99 })], { taxRate: 0, pricesIncludeTax: false }).total).toBe(
      4.99
    );
    expect(
      calculateSale([line({ quantity: 0.333, unitPrice: 12 })], { taxRate: 0, pricesIncludeTax: false }).subtotal
    ).toBe(4);
  });

  it('taxes a measured line on its rounded amount', () => {
    const result = calculateSale([line({ quantity: 1.25, unitPrice: 3.99 })], { taxRate: 8.25, pricesIncludeTax: false });
    expect(result).toMatchObject({ subtotal: 4.99, taxAmount: 0.41, total: 5.4 });
  });
});
