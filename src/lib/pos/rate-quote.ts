/**
 * How exchange rates are written for people.
 *
 * A rate is kept as units of the other currency per 1 unit of the store currency
 * (132.5 HTG per dollar in a dollar store, 0.0075 USD per gourde in a gourde store).
 * It is written with the store currency first and "1" on the stronger currency:
 * "1 USD = 132.5 HTG" in a dollar store, "132.5 HTG = 1 USD" in a gourde store.
 *
 * The two rates are named after the stronger currency, whatever the store currency:
 *  - sell rate: the weaker currency turned into the stronger one (HTG → USD);
 *  - buy rate: the stronger currency turned into the weaker one (USD → HTG).
 * The store keeps one rate for the other currency coming in and one for it going out
 * (change). Which of the two is "sell" depends on which currency is the stronger.
 */

/** The store currency is the weaker one: the rate is written the other way round */
export const isInvertedRate = (rate: number) => rate > 0 && rate < 1;

/** The number written next to the weaker currency (132.5 for both store currencies) */
export function quotedRate(rate: number): number {
  const value = isInvertedRate(rate) ? 1 / rate : rate;
  return Number(value.toPrecision(10));
}

/** The kept rate for a number typed the way it is written */
export const rateFromQuoted = (value: number, inverted: boolean) => (inverted ? 1 / value : value);

const formatQuoted = (rate: number, digits: number) => quotedRate(rate).toLocaleString(undefined, { maximumFractionDigits: digits });

/** "1 USD = 132.5 HTG" or "132.5 HTG = 1 USD" (store currency first) */
export function quoteRate(base: string, code: string, rate: number, digits = 4): string {
  return isInvertedRate(rate) ? `${formatQuoted(rate, digits)} ${base} = 1 ${code}` : `1 ${base} = ${formatQuoted(rate, digits)} ${code}`;
}

/** "132.5 HTG/USD": the weaker currency per unit of the stronger, for receipts */
export function quoteRateShort(base: string, code: string, rate: number, digits = 4): string {
  return isInvertedRate(rate) ? `${formatQuoted(rate, digits)} ${base}/${code}` : `${formatQuoted(rate, digits)} ${code}/${base}`;
}

export type RateName = 'sell' | 'buy';

/** Name of the rate that values the other currency coming in (a payment in it) */
export const receivedRateName = (rate: number): RateName => (isInvertedRate(rate) ? 'buy' : 'sell');

/** Name of the rate used to give the other currency out (change in it) */
export const givenRateName = (rate: number): RateName => (isInvertedRate(rate) ? 'sell' : 'buy');
