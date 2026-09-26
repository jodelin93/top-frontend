/**
 * Measured quantities at the till (spec §5/§7): items whose unit allows decimals are
 * sold by weight, length or volume ("1.250 kg"); everything else by whole units.
 * Same rules as top-backend/src/common/utils/quantity.ts. Sums go through integers
 * scaled by 10,000 so 0.1 + 0.2 stays 0.3.
 */

// Unit of measure as the POS catalog sends it (null / absent = by the piece)
export interface CatalogUnit {
  code: string | null;
  allowsDecimals: boolean;
  // Decimals allowed (1–4) when allowsDecimals
  precision: number;
}

const QTY_SCALE = 10_000;

const qtyUnits = (value: number): number => Math.round(Number((Number(value) * QTY_SCALE).toPrecision(15)));

/** a + b + …, exactly (4 decimals) */
export const addQty = (...values: number[]): number =>
  values.reduce((sum, v) => sum + qtyUnits(v ?? 0), 0) / QTY_SCALE || 0;

/** a − b, exactly (4 decimals) */
export const subQty = (a: number, b: number): number => (qtyUnits(a) - qtyUnits(b)) / QTY_SCALE || 0;

/** Sold by weight / length / volume (decimal quantities) */
export const isMeasured = (unit: CatalogUnit | null | undefined): boolean => !!unit?.allowsDecimals;

/** Decimals a quantity of this unit may have (0 for pieces) */
export const unitPrecision = (unit: CatalogUnit | null | undefined): number =>
  unit && isMeasured(unit) ? Math.min(Math.max(Math.round(unit.precision ?? 0), 0), 4) : 0;

/** Round to what the unit allows (whole units for pieces) */
export function roundToUnit(quantity: number, unit: CatalogUnit | null | undefined): number {
  const step = 10 ** unitPrecision(unit);
  return Math.round(Number((quantity * step).toPrecision(15))) / step;
}

/**
 * Read a typed quantity ("1,25" or "1.25"): null when it is not a valid quantity of
 * this unit (not > 0, decimals on a piece item, more decimals than the precision).
 */
export function parseQuantity(text: string, unit: CatalogUnit | null | undefined): number | null {
  const clean = text.trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(clean)) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value <= 0) return null;
  const decimals = (clean.split('.')[1] ?? '').replace(/0+$/, '').length;
  if (decimals > unitPrecision(unit)) return null;
  return value;
}

/**
 * Quantity with the unit's precision and symbol: 1.25 kg → "1.250 kg";
 * pieces → "3" (or "3 pc" when the unit has a code and withPieceUnit is set).
 */
export function formatQuantity(
  quantity: number,
  unit: CatalogUnit | null | undefined,
  options: { withPieceUnit?: boolean } = {}
): string {
  const value = Math.round(Number((Number(quantity ?? 0) * QTY_SCALE).toPrecision(15))) / QTY_SCALE;
  if (!unit || !isMeasured(unit)) {
    const text = String(value);
    return options.withPieceUnit && unit?.code ? `${text} ${unit.code}` : text;
  }
  const actual = (String(value).split('.')[1] ?? '').length;
  const text = value.toFixed(Math.min(Math.max(unitPrecision(unit), actual), 4));
  return unit.code ? `${text} ${unit.code}` : text;
}

/** Unit of a sold line from its snapshot (sale item metadata), null for pieces */
export function lineUnit(
  metadata: { unit?: string | null; unitPrecision?: number | null } | null | undefined
): CatalogUnit | null {
  if (!metadata?.unitPrecision) return null;
  return { code: metadata.unit ?? null, allowsDecimals: true, precision: metadata.unitPrecision };
}

/**
 * "Number of items" of a cart or sale: pieces count by quantity, each measured line
 * (a weighing) counts once.
 */
export const itemCount = (lines: { quantity: number; unit?: CatalogUnit | null }[]): number =>
  lines.reduce((sum, line) => sum + (isMeasured(line.unit) ? 1 : line.quantity), 0);

/**
 * Receipt text of a sold line's quantity and price: "1.250 kg × 3.99/kg" for a
 * measured line (unit kept on the sale item), "2 × 3.99" otherwise.
 */
export function lineQuantityText(
  item: { quantity: number | string; unitPrice: number | string; metadata?: Parameters<typeof lineUnit>[0] },
  money: (value: number) => string,
  times = '×'
): string {
  const unit = lineUnit(item.metadata);
  const price = money(Number(item.unitPrice));
  if (!unit) return `${Number(item.quantity)} ${times} ${price}`;
  return `${formatQuantity(Number(item.quantity), unit)} ${times} ${price}${unit.code ? `/${unit.code}` : ''}`;
}

// Typed stock quantities in admin forms: up to 4 decimals (measured items); the server
// checks each item's unit (whole units for pieces, the unit's precision otherwise)
export const QUANTITY_TEXT = /^\d+(\.\d{1,4})?$/;
export const SIGNED_QUANTITY_TEXT = /^[-+]?\d+(\.\d{1,4})?$/;
