/**
 * Orders of the product list (Admin › Products). The list is loaded whole, so it is
 * sorted in the page: the choice applies at once, with the filters.
 */
import type { Product } from '@/lib/api/products';
import { text } from '@/lib/api/crud';

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'name-asc',
  'name-desc',
  'price-asc',
  'price-desc',
  'stock-asc',
  'stock-desc',
  'category-asc',
  'sku-asc',
  'updated-desc',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];
export const DEFAULT_PRODUCT_SORT: ProductSort = 'newest';

export const isProductSort = (value: unknown): value is ProductSort =>
  typeof value === 'string' && (PRODUCT_SORTS as readonly string[]).includes(value);

// The lowest price of the sellable variants (as in the list), none last
const lowestPrice = (product: Product) => {
  const prices = product.variants
    .filter((v) => v.status !== 'discontinued' && v.price != null)
    .map((v) => Number(v.price));
  return prices.length ? Math.min(...prices) : null;
};
const stockOf = (product: Product) => product.variants.reduce((sum, v) => sum + Number(v.stockQuantity ?? 0), 0);
const time = (value: string | undefined) => (value ? new Date(value).getTime() : 0);

const collator = () => new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** A sorted copy; equal products keep their name order */
export function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const words = collator();
  const name = (p: Product) => text(p.name);
  const byName = (a: Product, b: Product) => words.compare(name(a), name(b));
  // Missing values (no price, no category) go last in both directions
  const missingLast = <T,>(a: T | null, b: T | null, compare: (x: T, y: T) => number) =>
    a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : compare(a, b);

  const compare: Record<ProductSort, (a: Product, b: Product) => number> = {
    newest: (a, b) => time(b.createdAt) - time(a.createdAt),
    oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
    'name-asc': byName,
    'name-desc': (a, b) => byName(b, a),
    'price-asc': (a, b) => missingLast(lowestPrice(a), lowestPrice(b), (x, y) => x - y),
    'price-desc': (a, b) => missingLast(lowestPrice(a), lowestPrice(b), (x, y) => y - x),
    'stock-asc': (a, b) => stockOf(a) - stockOf(b),
    'stock-desc': (a, b) => stockOf(b) - stockOf(a),
    'category-asc': (a, b) =>
      missingLast(a.category ? text(a.category.name) : null, b.category ? text(b.category.name) : null, (x, y) =>
        words.compare(x, y)
      ),
    'sku-asc': (a, b) => words.compare(a.sku ?? '', b.sku ?? ''),
    'updated-desc': (a, b) => time(b.updatedAt) - time(a.updatedAt),
  };
  return [...products].sort((a, b) => compare[sort](a, b) || byName(a, b));
}
