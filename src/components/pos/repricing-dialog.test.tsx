import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogItem } from '@/lib/api/sales';
import type { Discount } from '@/lib/api/discounts';
import { revalidateCart, type CurrentLine, type Revalidation } from '@/lib/pos/cart-revalidation';
import { formatMoney } from '@/lib/format';
import { usePOSStore } from '@/stores/pos-store';
import { RepricingDialog } from './repricing-dialog';

const item = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  variantId: 'v1',
  productId: 'p1',
  categoryId: null,
  productName: 'Coffee',
  variantName: null,
  sku: 'COF-1',
  barcode: null,
  price: 10,
  stock: 5,
  imageUrl: null,
  taxRate: 0,
  ...overrides,
});

const usd = (value: number) => formatMoney(value, 'USD');
const store = () => usePOSStore.getState();
const tax = { taxRate: 0, pricesIncludeTax: false };

// The cart compared with current values (by variant), as the POS page does
const compare = (current: Record<string, CurrentLine>): Revalidation<Discount> =>
  revalidateCart<Discount>({
    lines: store().cart,
    discount: store().discount,
    cartDiscount: store().cartDiscount,
    tax,
    current: new Map(store().cart.map((l) => [l.key, current[l.variantId]])),
  });

// Wired like the POS page: confirm applies and records, cancel closes, fixes re-check
function Harness({ initial, current }: { initial: Revalidation<Discount>; current: Record<string, CurrentLine> }) {
  const [result, setResult] = useState<Revalidation<Discount> | null>(initial);
  const recheck = () => {
    const next = compare(current);
    setResult(next.changed ? next : null);
  };
  return (
    <RepricingDialog
      result={result}
      currency="USD"
      heldCart
      busy={false}
      onConfirm={() => {
        store().applyRepricing(result!.apply, { confirmedAt: '2026-09-25T10:00:00.000Z', previousTotal: result!.totalBefore });
        setResult(null);
      }}
      onCancel={() => setResult(null)}
      onRemove={(key) => {
        store().removeItem(key);
        recheck();
      }}
      onReduce={(key, quantity) => {
        store().setQuantity(key, quantity);
        recheck();
      }}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  usePOSStore.setState(usePOSStore.getInitialState(), true);
});

describe('RepricingDialog', () => {
  it('lists each changed line with the old and new amounts and the total difference', () => {
    store().addItem(item());
    store().addItem(item());
    render(<Harness initial={compare({ v1: { price: 12 } })} current={{ v1: { price: 12 } }} />);

    expect(screen.getByText('Prices changed since this cart was held')).toBeInTheDocument();
    const row = screen.getByTestId(`repriced-line-${store().cart[0].key}`);
    expect(row).toHaveTextContent('Coffee');
    expect(row).toHaveTextContent('Price went up');
    expect(row).toHaveTextContent(usd(20));
    expect(row).toHaveTextContent(usd(24));
    expect(screen.getByTestId('repricing-total-before')).toHaveTextContent(usd(20));
    expect(screen.getByTestId('repricing-total-after')).toHaveTextContent(usd(24));
    expect(screen.getByTestId('repricing-difference')).toHaveTextContent(`+${usd(4)}`);
  });

  it('applies the new prices and records the confirmation on "Continue with the new prices"', async () => {
    store().addItem(item());
    render(<Harness initial={compare({ v1: { price: 12 } })} current={{ v1: { price: 12 } }} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue with the new prices' }));

    expect(store().cart[0]).toMatchObject({ unitPrice: 12, catalogPrice: 12 });
    expect(store().repricing).toEqual({ confirmedAt: '2026-09-25T10:00:00.000Z', previousTotal: 10 });
    expect(store().needsRevalidation).toBe(false);
    expect(screen.queryByText('Prices changed since this cart was held')).not.toBeInTheDocument();
  });

  it('keeps the cart as it was on "Keep cart and go back"', async () => {
    store().addItem(item());
    const before = store().cart;
    render(<Harness initial={compare({ v1: { price: 12 } })} current={{ v1: { price: 12 } }} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Keep cart and go back' }));

    expect(store().cart).toEqual(before);
    expect(store().cart[0].unitPrice).toBe(10);
    expect(store().repricing).toBeNull();
    expect(screen.queryByText('Prices changed since this cart was held')).not.toBeInTheDocument();
  });

  it('cannot continue until lines that cannot be sold are removed or reduced', async () => {
    const user = userEvent.setup();
    store().addItem(item());
    store().addItem(item());
    store().addItem(item({ variantId: 'v2', productId: 'p2', productName: 'Tea', price: 4 }));
    const current = { v1: { price: 10, available: 1 }, v2: { price: null } };
    render(<Harness initial={compare(current)} current={current} />);

    expect(screen.getByText('Not enough stock (1 available)')).toBeInTheDocument();
    expect(screen.getByText('No longer sold')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Continue with the new prices' });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Keep 1' }));
    expect(store().cart[0].quantity).toBe(1);
    expect(confirm).toBeDisabled();

    const teaRow = screen.getByTestId(`repriced-line-${store().cart[1].key}`);
    await user.click(teaRow.querySelector('button')!);
    expect(store().cart.map((l) => l.productName)).toEqual(['Coffee']);
  });

  it('closes like "Keep cart and go back" with Escape', async () => {
    const onCancel = vi.fn();
    store().addItem(item());
    render(
      <RepricingDialog
        result={compare({ v1: { price: 12 } })}
        currency="USD"
        heldCart={false}
        busy={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        onRemove={vi.fn()}
        onReduce={vi.fn()}
      />
    );
    expect(screen.getByText('Prices changed since this cart was priced')).toBeInTheDocument();
    await userEvent.setup().keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });
});
