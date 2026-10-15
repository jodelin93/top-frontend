import { describe, expect, it } from 'vitest';
import type { Product } from '@/lib/api/products';
import { sortProducts } from './product-sort';

const product = (name: string, over: Partial<Product> & { price?: number | null; stock?: number } = {}): Product => {
  const { price = 10, stock = 0, ...rest } = over;
  return {
    id: name,
    sku: name.toUpperCase(),
    name: { en: name },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    category: null,
    variants: [{ status: 'active', price, stockQuantity: stock }],
    ...rest,
  } as unknown as Product;
};
const names = (list: Product[]) => list.map((p) => p.name.en);

describe('sortProducts', () => {
  const mug = product('mug', { createdAt: '2026-10-03T00:00:00Z', price: 5, stock: 3, category: { id: 'k', name: { en: 'Kitchen' } } });
  const apron = product('Apron', { createdAt: '2026-10-01T00:00:00Z', price: null, stock: 10 });
  const print = product('Printing', { createdAt: '2026-10-02T00:00:00Z', price: 25, stock: 0, category: { id: 's', name: { en: 'Services' } } });
  const all = [apron, mug, print];

  it('orders by creation date, newest or oldest first', () => {
    expect(names(sortProducts(all, 'newest'))).toEqual(['mug', 'Printing', 'Apron']);
    expect(names(sortProducts(all, 'oldest'))).toEqual(['Apron', 'Printing', 'mug']);
  });

  it('orders by name without minding capitals', () => {
    expect(names(sortProducts(all, 'name-asc'))).toEqual(['Apron', 'mug', 'Printing']);
    expect(names(sortProducts(all, 'name-desc'))).toEqual(['Printing', 'mug', 'Apron']);
  });

  it('orders by price and stock, products without a price last', () => {
    expect(names(sortProducts(all, 'price-asc'))).toEqual(['mug', 'Printing', 'Apron']);
    expect(names(sortProducts(all, 'price-desc'))).toEqual(['Printing', 'mug', 'Apron']);
    expect(names(sortProducts(all, 'stock-desc'))).toEqual(['Apron', 'mug', 'Printing']);
  });

  it('orders by category, products without one last', () => {
    expect(names(sortProducts(all, 'category-asc'))).toEqual(['mug', 'Printing', 'Apron']);
  });

  it('leaves the list it was given untouched', () => {
    sortProducts(all, 'name-desc');
    expect(names(all)).toEqual(['Apron', 'mug', 'Printing']);
  });
});
