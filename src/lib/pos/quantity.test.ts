import { describe, expect, it } from 'vitest';
import { addQty, formatQuantity, itemCount, lineUnit, parseQuantity, roundToUnit, subQty } from './quantity';
import { addBlockedBy, stockShortfalls } from './stock-check';

const kg = { code: 'kg', allowsDecimals: true, precision: 3 };
const piece = null;

describe('measured quantities', () => {
  it('formats with the unit precision and symbol', () => {
    expect(formatQuantity(1.25, kg)).toBe('1.250 kg');
    expect(formatQuantity(0.333, { code: 'm', allowsDecimals: true, precision: 3 })).toBe('0.333 m');
    expect(formatQuantity(3, piece)).toBe('3');
    expect(formatQuantity(3, { code: 'pc', allowsDecimals: false, precision: 0 }, { withPieceUnit: true })).toBe(
      '3 pc'
    );
  });

  it('parses typed quantities by the unit rules', () => {
    expect(parseQuantity('1.25', kg)).toBe(1.25);
    expect(parseQuantity('1,250', kg)).toBe(1.25);
    expect(parseQuantity('1.2505', kg)).toBeNull();
    expect(parseQuantity('0', kg)).toBeNull();
    expect(parseQuantity('abc', kg)).toBeNull();
    expect(parseQuantity('2', piece)).toBe(2);
    expect(parseQuantity('1.5', piece)).toBeNull();
  });

  it('adds without drift and rounds to the unit', () => {
    expect(addQty(0.1, 0.2)).toBe(0.3);
    expect(subQty(0.3, 0.1)).toBe(0.2);
    expect(roundToUnit(1.23456, kg)).toBe(1.235);
    expect(roundToUnit(2.4, piece)).toBe(2);
  });

  it('counts each weighing once in the number of items', () => {
    expect(itemCount([{ quantity: 2 }, { quantity: 1.25, unit: kg }, { quantity: 0.5, unit: kg }])).toBe(4);
  });

  it('reads the unit a sold line kept', () => {
    expect(lineUnit({ unit: 'kg', unitPrecision: 3 })).toEqual(kg);
    expect(lineUnit({})).toBeNull();
  });
});

describe('stock limits with weights', () => {
  const cart = [
    { key: 'a', variantId: 'apples', quantity: 0.1, stock: 0.3 },
    { key: 'b', variantId: 'apples', quantity: 0.1, stock: 0.3 },
  ];

  it('allows exactly what is on the shelf', () => {
    expect(addBlockedBy(cart, { variantId: 'apples', stock: 0.3 }, 0.1)).toBeNull();
    expect(addBlockedBy(cart, { variantId: 'apples', stock: 0.3 }, 0.101)).toBe(0.3);
  });

  it('sums weighed lines exactly', () => {
    expect(stockShortfalls([...cart, { key: 'c', variantId: 'apples', quantity: 0.1, stock: 0.3 }])).toEqual([]);
  });
});
