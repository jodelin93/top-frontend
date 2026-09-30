import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { amountDueIn, buyRatesOf, changeIn, exchangeRate, foreignChange, toSaleCurrency } from './currency-math';

const FRONTEND_COPY = path.resolve(__dirname, 'currency-math.ts');
const BACKEND_SOURCE = path.resolve(__dirname, '../../../../top-backend/src/currency/currency-math.ts');
const withoutHeader = (file: string): string =>
  readFileSync(file, 'utf8').replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');

describe('currency-math copy', () => {
  it('is identical to the backend version apart from the header comment', () => {
    expect(withoutHeader(FRONTEND_COPY)).toBe(withoutHeader(BACKEND_SOURCE));
  });
});

describe('paying 10.00 USD in HTG at 132.50', () => {
  const rate = exchangeRate({ HTG: 132.5 }, 'USD', 'USD', 'HTG')!;

  it('asks for 1325 HTG and that covers the sale', () => {
    expect(amountDueIn(10, rate)).toBe(1325);
    expect(toSaleCurrency(1325, rate)).toBeCloseTo(10, 10);
  });

  it('gives change in HTG, rounded down', () => {
    // 2000 HTG for 10.00: 5.0943 USD of change = 675.00 HTG
    const change = toSaleCurrency(2000, rate) - 10;
    expect(changeIn(change, rate)).toBe(675);
  });
});

describe('buy and sell rates', () => {
  it('uses the buy rate where one is set, else the sell rate', () => {
    expect(buyRatesOf({ HTG: 135, EUR: 0.9 }, { HTG: 130, GBP: 2 })).toEqual({ HTG: 130, EUR: 0.9 });
  });

  it('gives HTG paid back in HTG without the spread, and dollars at the buy rate', () => {
    // 10 USD due at sell 135 = 1350 HTG; 2000 HTG handed over
    const excess = 2000 / 135 - 10;
    expect(foreignChange(excess, 2000 / 135, 135, 130)).toBe(650);
    // Paid 20 USD cash, change in HTG: 10 USD at the buy rate
    expect(foreignChange(10, 0, 135, 130)).toBe(1300);
    // 1000 HTG + 10 USD for a 10 USD sale: the HTG part goes back as HTG, no spread
    expect(foreignChange(1000 / 135, 1000 / 135, 135, 130)).toBe(1000);
  });
});
