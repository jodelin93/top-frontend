/**
 * Stock limits at the till (D018: stock never goes negative). Online the server
 * refuses a sale beyond the stock; offline the till only has the cached catalog, so
 * it refuses to put more in the cart than that catalog says is on the shelf.
 * Services and other non-stock items (stockTracked false) are never limited.
 * Quantities may be decimal for measured items (kg, m, l): summed exactly.
 */
import { addQty } from './quantity';

export interface StockLine {
  key: string;
  variantId: string;
  quantity: number;
  // Units available when the item was added (cached catalog); null = unknown / not tracked
  stock: number | null;
  stockTracked?: boolean;
}

/** Units of a variant the cart may hold, or null when there is no limit */
export function stockLimit(line: Pick<StockLine, 'stock' | 'stockTracked'>): number | null {
  if (line.stockTracked === false || line.stock === null || line.stock === undefined) return null;
  return Math.max(0, line.stock);
}

/** Units of the variant already in the cart, leaving out one line (the one being changed) */
function inCart(cart: StockLine[], variantId: string, exceptKey?: string): number {
  return cart
    .filter((l) => l.variantId === variantId && l.key !== exceptKey)
    .reduce((sum, l) => addQty(sum, l.quantity), 0);
}

/**
 * Whether `quantity` more (default one unit; a weight for measured items) of an item
 * can go in the cart. Returns the limit when it cannot, null when it can.
 */
export function addBlockedBy(
  cart: StockLine[],
  item: { variantId: string; stock: number | null; stockTracked?: boolean },
  quantity = 1
): number | null {
  const limit = stockLimit(item);
  if (limit === null) return null;
  return addQty(inCart(cart, item.variantId), quantity) > limit ? limit : null;
}

/**
 * Whether a line can be set to `quantity` (the variant may be on other lines too).
 * Returns the limit when it cannot, null when it can. Lowering is always allowed.
 */
export function quantityBlockedBy(cart: StockLine[], key: string, quantity: number): number | null {
  const line = cart.find((l) => l.key === key);
  if (!line || quantity <= line.quantity) return null;
  const limit = stockLimit(line);
  if (limit === null) return null;
  return addQty(inCart(cart, line.variantId, key), quantity) > limit ? limit : null;
}

/** Variants whose total quantity in the cart is above the stock (checked before checkout) */
export function stockShortfalls(cart: StockLine[]): { variantId: string; quantity: number; limit: number }[] {
  const seen = new Map<string, { quantity: number; limit: number | null }>();
  for (const line of cart) {
    const entry = seen.get(line.variantId) ?? { quantity: 0, limit: stockLimit(line) };
    entry.quantity = addQty(entry.quantity, line.quantity);
    seen.set(line.variantId, entry);
  }
  return [...seen]
    .filter(([, v]) => v.limit !== null && v.quantity > v.limit)
    .map(([variantId, v]) => ({ variantId, quantity: v.quantity, limit: v.limit! }));
}
