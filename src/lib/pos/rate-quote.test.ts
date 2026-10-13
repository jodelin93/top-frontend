import { describe, expect, it } from 'vitest';
import { givenRateName, isInvertedRate, quoteRate, quoteRateShort, quotedRate, rateFromQuoted, receivedRateName } from './rate-quote';

describe('how exchange rates are written', () => {
  it('writes a dollar store as 1 USD = 132.5 HTG', () => {
    expect(isInvertedRate(132.5)).toBe(false);
    expect(quoteRate('USD', 'HTG', 132.5)).toBe('1 USD = 132.5 HTG');
    expect(quoteRateShort('USD', 'HTG', 132.5)).toBe('132.5 HTG/USD');
  });

  it('writes a gourde store as 132.5 HTG = 1 USD', () => {
    // What the server keeps for a rate typed as 132.5: dollars per gourde
    const kept = Number(rateFromQuoted(132.5, true).toPrecision(12));
    expect(kept).toBeCloseTo(0.00754717, 8);
    expect(isInvertedRate(kept)).toBe(true);
    expect(quotedRate(kept)).toBe(132.5);
    expect(quoteRate('HTG', 'USD', kept)).toBe('132.5 HTG = 1 USD');
    expect(quoteRateShort('HTG', 'USD', kept)).toBe('132.5 HTG/USD');
  });

  it('gives back the number that was typed, also from a rate saved with a sale (8 decimals)', () => {
    for (const typed of [130, 132.5, 132.57, 135.25, 141.3]) {
      expect(quotedRate(Number((1 / typed).toPrecision(12)))).toBe(typed);
      expect(quoteRate('HTG', 'USD', Number((1 / typed).toFixed(8)), 2)).toBe(`${typed} HTG = 1 USD`);
    }
  });

  it('names the rates after the stronger currency', () => {
    // Dollar store: gourdes coming in become dollars (sell); change in gourdes (buy)
    expect(receivedRateName(134)).toBe('sell');
    expect(givenRateName(131)).toBe('buy');
    // Gourde store: dollars coming in become gourdes (buy); change in dollars (sell)
    expect(receivedRateName(1 / 130)).toBe('buy');
    expect(givenRateName(1 / 135)).toBe('sell');
  });
});
