import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Label } from '@/lib/api/products';
import { formatMoney } from '@/lib/format';
import { ProductLabelsSheet } from './product-labels-dialog';

const label = (overrides: Partial<Label> = {}): Label => ({
  variantId: 'v1',
  name: 'Rice 1kg',
  variantName: null,
  sku: 'RICE-1',
  code: '5012345678900',
  price: 4.5,
  ...overrides,
});

describe('ProductLabelsSheet', () => {
  it('renders one label per copy with name, variant, price and barcode', () => {
    const labels = [
      label(),
      label(),
      label({ variantId: 'v2', name: 'T-shirt', variantName: 'Large', sku: 'TS-L', code: 'TS-L', price: 12 }),
    ];
    // A cost sneaking into the data must never be printed
    const withCost = labels.map((l) => ({ ...l, cost: 1.23 }) as Label);
    const { container } = render(<ProductLabelsSheet labels={withCost} currency="USD" />);

    expect(screen.getAllByTestId('product-label')).toHaveLength(3);
    expect(screen.getAllByText('Rice 1kg')).toHaveLength(2);
    expect(screen.getAllByText(formatMoney(4.5, 'USD'))).toHaveLength(2);
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText(formatMoney(12, 'USD'))).toBeInTheDocument();
    // Code printed under the Code 128 barcode (SKU when there is no barcode)
    expect(screen.getAllByText('5012345678900')).toHaveLength(2);
    expect(screen.getByText('TS-L')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barcode TS-L' })).toBeInTheDocument();
    // Printable container, without any cost
    expect(container.querySelector('.print-labels')).not.toBeNull();
    expect(container.textContent).not.toMatch(/cost/i);
    expect(container.textContent).not.toContain(formatMoney(1.23, 'USD'));
  });
});
