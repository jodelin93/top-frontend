/**
 * Reprice and revalidate a stale cart before tendering (spec §5, AC05).
 *
 * A held cart that is resumed, an estimate loaded into the till, or a cart that sat for
 * a while is compared with what the store sells now: the server's quote online, the
 * cached catalog offline. Every difference in price, tax, promotion or stock is listed
 * so the cashier can show it to the customer and confirm it; the total never changes
 * silently.
 *
 * Pure: no store, no network. The POS page gathers the current values and calls it.
 */
import type { CartDiscountInput } from '@/lib/api/sales';
import type { CartItem } from '@/stores/pos-store';
import { addQty } from './quantity';
import { calculateSale, round2, type CalcDiscount, type CalcResult } from './sale-calculator';

export type ChangeReason =
  | 'price'
  | 'tax'
  // The discount code / promotion gave this line a discount and no longer does
  | 'promotion_lost'
  // The discount code / promotion now gives this line a discount
  | 'promotion_gained'
  // Fewer units available than the cart holds
  | 'stock'
  // The item is no longer sold (inactive, deleted)
  | 'unsellable';

/** What the store sells a cart line at now */
export interface CurrentLine {
  // Reference (catalog / quoted) price now; null: the item is no longer sold
  price: number | null;
  // Tax rate now (percent, null = store default); undefined: unknown, kept as held
  taxRate?: number | null;
  // Units of the variant this cart may sell now; null / undefined: no limit or unknown
  available?: number | null;
}

/** Figures of the server's quote (authoritative online), by cart line key */
export interface QuotedTotals {
  // Total of the cart lines (gift cards left out)
  total: number;
  lines: Map<string, { unitPrice: number; taxRate?: number | null; total: number }>;
}

export type RevalidationLine = Pick<
  CartItem,
  | 'key'
  | 'variantId'
  | 'productId'
  | 'categoryId'
  | 'productName'
  | 'variantName'
  | 'quantity'
  | 'unitPrice'
  | 'catalogPrice'
  | 'discountPercent'
  | 'taxRate'
  | 'stockTracked'
>;

export interface RevalidationInput<D extends CalcDiscount = CalcDiscount> {
  // The cart as held (prices, tax and discounts it was rung up with)
  lines: RevalidationLine[];
  discount: D | null;
  cartDiscount: CartDiscountInput | null;
  tax: { taxRate: number; pricesIncludeTax: boolean };
  // Current values by line key; a line missing here is unchanged
  current: Map<string, CurrentLine>;
  // The discount code now: undefined = unchanged, null = no longer valid
  currentDiscount?: D | null;
  // A code that was already found invalid (and dropped) when the cart was loaded
  discountCodeLost?: string | null;
  // Total of the cart when it was held (server figure); defaults to the local calculation
  heldTotal?: number | null;
  // Server quote of the new cart (online); offline the new totals are computed locally
  quote?: QuotedTotals | null;
}

export interface LineFigures {
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface LineChange {
  key: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  before: LineFigures;
  // Null when the item can no longer be sold
  after: LineFigures | null;
  reasons: ChangeReason[];
  // Units available now (stock reason)
  available: number | null;
  // Must be removed or reduced before the sale can continue
  blocking: boolean;
}

export interface Revalidation<D extends CalcDiscount = CalcDiscount> {
  changed: boolean;
  // Lines that changed, in cart order
  lines: LineChange[];
  // Discount code that no longer applies to the sale
  discountCodeLost: string | null;
  totalBefore: number;
  totalAfter: number;
  difference: number;
  // Some lines cannot be sold as they are (no longer sold / not enough stock)
  blocking: boolean;
  // Values applied to the cart when the cashier confirms, by line key
  apply: {
    catalogPrices: Map<string, number>;
    taxRates: Map<string, number | null>;
    discount: D | null;
  };
}

const cents = (value: number) => Math.round(round2(value) * 100);
const sameRate = (a: number, b: number) => Math.round(a * 10_000) === Math.round(b * 10_000);
const overridden = (line: RevalidationLine) => cents(line.unitPrice) !== cents(line.catalogPrice ?? line.unitPrice);

/** Discount the promotion (discount code) gives each line: with it minus without it */
function promotionByLine(withCode: CalcResult, withoutCode: CalcResult): Map<string, number> {
  const without = new Map(withoutCode.lines.map((l) => [l.key, l.discountAmount]));
  return new Map(withCode.lines.map((l) => [l.key, round2(l.discountAmount - (without.get(l.key) ?? 0))]));
}

export function revalidateCart<D extends CalcDiscount>(input: RevalidationInput<D>): Revalidation<D> {
  const { lines, tax, cartDiscount } = input;
  const heldDiscount = input.discount;
  const newDiscount = input.currentDiscount === undefined ? heldDiscount : input.currentDiscount;
  const rateOf = (rate: number | null | undefined) => rate ?? tax.taxRate;

  const calc = (
    rows: { line: RevalidationLine; unitPrice: number; taxRate: number | null }[],
    discount: D | null
  ) =>
    calculateSale(
      rows.map(({ line, unitPrice, taxRate }) => ({
        key: line.key,
        productId: line.productId,
        categoryId: line.categoryId,
        quantity: line.quantity,
        unitPrice,
        discountPercent: line.discountPercent,
        taxRate,
      })),
      { taxRate: tax.taxRate, pricesIncludeTax: tax.pricesIncludeTax, discount, cartDiscount }
    );

  // ---- The cart as held ----
  const beforeRows = lines.map((line) => ({ line, unitPrice: line.unitPrice, taxRate: line.taxRate ?? null }));
  const before = calc(beforeRows, heldDiscount);
  const promoBefore = promotionByLine(before, calc(beforeRows, null));

  // ---- The cart at today's values ----
  const next = lines.map((line) => {
    const current = input.current.get(line.key);
    const sellable = !current || current.price !== null;
    const catalogPrice = current && current.price !== null ? current.price : (line.catalogPrice ?? line.unitPrice);
    return {
      line,
      sellable,
      catalogPrice,
      // A price changed at the till stays what the cashier typed
      unitPrice: overridden(line) ? line.unitPrice : catalogPrice,
      taxRate: current && current.taxRate !== undefined ? current.taxRate : (line.taxRate ?? null),
      available: current?.available ?? null,
    };
  });
  const sellableRows = next.filter((row) => row.sellable);
  const after = calc(sellableRows, newDiscount);
  const promoAfter = promotionByLine(after, calc(sellableRows, null));
  const afterByKey = new Map(after.lines.map((l) => [l.key, l]));

  // Units of each variant the cart holds (a variant can be on several lines)
  const inCart = new Map<string, number>();
  for (const row of sellableRows) {
    if (row.line.stockTracked === false) continue;
    inCart.set(row.line.variantId, addQty(inCart.get(row.line.variantId) ?? 0, row.line.quantity));
  }

  const changes: LineChange[] = [];
  for (const row of next) {
    const { line } = row;
    const beforeLine = before.lines.find((l) => l.key === line.key)!;
    const beforeFigures: LineFigures = {
      unitPrice: line.unitPrice,
      taxRate: rateOf(line.taxRate),
      total: beforeLine.total,
    };
    if (!row.sellable) {
      changes.push({
        key: line.key,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        before: beforeFigures,
        after: null,
        reasons: ['unsellable'],
        available: null,
        blocking: true,
      });
      continue;
    }

    const quoted = input.quote?.lines.get(line.key);
    const local = afterByKey.get(line.key)!;
    const afterFigures: LineFigures = {
      unitPrice: quoted?.unitPrice ?? row.unitPrice,
      taxRate: rateOf(quoted?.taxRate !== undefined ? quoted.taxRate : row.taxRate),
      total: quoted?.total ?? local.total,
    };

    const reasons: ChangeReason[] = [];
    if (cents(afterFigures.unitPrice) !== cents(beforeFigures.unitPrice)) reasons.push('price');
    if (!sameRate(afterFigures.taxRate, beforeFigures.taxRate)) reasons.push('tax');
    const had = (promoBefore.get(line.key) ?? 0) > 0;
    const has = (promoAfter.get(line.key) ?? 0) > 0;
    if (had && !has) reasons.push('promotion_lost');
    if (!had && has) reasons.push('promotion_gained');
    const short =
      line.stockTracked !== false &&
      row.available !== null &&
      (inCart.get(line.variantId) ?? 0) > Math.max(0, row.available);
    if (short) reasons.push('stock');
    if (reasons.length === 0) continue;

    changes.push({
      key: line.key,
      productName: line.productName,
      variantName: line.variantName,
      quantity: line.quantity,
      before: beforeFigures,
      after: afterFigures,
      reasons,
      available: short ? Math.max(0, row.available!) : null,
      blocking: short,
    });
  }

  const totalBefore = round2(input.heldTotal ?? before.total);
  const totalAfter = round2(input.quote?.total ?? after.total);
  const difference = round2(totalAfter - totalBefore);
  const discountCodeLost =
    input.discountCodeLost ?? (heldDiscount && newDiscount === null ? heldDiscount.code : null);

  return {
    changed: changes.length > 0 || !!discountCodeLost || cents(totalAfter) !== cents(totalBefore),
    lines: changes,
    discountCodeLost,
    totalBefore,
    totalAfter,
    difference,
    blocking: changes.some((c) => c.blocking),
    apply: {
      catalogPrices: new Map(sellableRows.map((row) => [row.line.key, row.catalogPrice])),
      taxRates: new Map(sellableRows.map((row) => [row.line.key, row.taxRate])),
      discount: newDiscount,
    },
  };
}
