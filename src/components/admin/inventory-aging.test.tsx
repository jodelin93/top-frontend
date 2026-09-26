import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgingReport } from '@/lib/api/inventory';
import { AgingTab } from './inventory-aging';

const api = vi.hoisted(() => ({ aging: vi.fn() }));

vi.mock('@/lib/api/inventory', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/inventory')>();
  return { ...original, inventoryApi: { ...original.inventoryApi, aging: api.aging } };
});
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  locationsApi: {
    list: () =>
      Promise.resolve([
        { id: 'l1', code: 'FLOOR', name: 'Floor', warehouseId: 'w1', isSellable: true, stockStatus: 'sellable' },
        { id: 'lt', code: 'TRANSIT', name: 'In transit', warehouseId: 'w2', isSellable: false, stockStatus: 'transit' },
      ]),
  },
  warehousesApi: {
    list: () =>
      Promise.resolve([
        { id: 'w1', name: 'Shop' },
        { id: 'w2', name: 'In transit' },
      ]),
  },
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => ({ data: {} }),
  useCurrency: () => 'USD',
}));

const report = (withValue: boolean): AgingReport => {
  const value = <T,>(v: T) => (withValue ? { stockValue: v } : {});
  return {
    generatedAt: '2026-09-24T00:00:00Z',
    buckets: [
      { key: '0-30', lines: 1, quantity: 5, ...value(50) },
      { key: '31-60', lines: 0, quantity: 0, ...value(0) },
      { key: '61-90', lines: 0, quantity: 0, ...value(0) },
      { key: '91-180', lines: 0, quantity: 0, ...value(0) },
      { key: '181+', lines: 1, quantity: 2, ...value(40) },
      { key: 'unknown', lines: 0, quantity: 0, ...value(0) },
    ],
    // Deliberately not sorted: the table shows the oldest first
    items: [
      {
        variantId: 'v1',
        locationId: 'l1',
        sku: 'NEW-1',
        productName: { en: 'Fresh item' },
        variantName: null,
        locationCode: 'FLOOR',
        locationName: 'Floor',
        stockStatus: 'sellable',
        quantityOnHand: 5,
        lastReceivedAt: '2026-09-14T00:00:00Z',
        agedFrom: '2026-09-14T00:00:00Z',
        days: 10,
        bucket: '0-30',
        ...value(50),
      },
      {
        variantId: 'v2',
        locationId: 'l1',
        sku: 'OLD-1',
        productName: { en: 'Old item' },
        variantName: null,
        locationCode: 'FLOOR',
        locationName: 'Floor',
        stockStatus: 'sellable',
        quantityOnHand: 2,
        lastReceivedAt: null,
        agedFrom: '2026-01-01T00:00:00Z',
        days: 266,
        bucket: '181+',
        ...value(40),
      },
    ],
  };
};

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<AgingTab />, { wrapper });
};

describe('AgingTab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows bucket totals and lines oldest first, without values when costs are hidden', async () => {
    api.aging.mockResolvedValue(report(false));
    renderTab();

    expect(await screen.findByText('Old item')).toBeInTheDocument();
    expect(screen.getByText('Over 180 days')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.queryByText('Stock value')).not.toBeInTheDocument();
    expect(screen.queryByText('$50.00')).not.toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('OLD-1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('266')).toBeInTheDocument();
    expect(within(rows[1]).getByText('NEW-1')).toBeInTheDocument();
    // The transit location is not offered as a filter
    expect(await screen.findByRole('option', { name: 'Shop › Floor' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /In transit/ })).not.toBeInTheDocument();
  });

  it('shows the stock value column when the user may see costs', async () => {
    api.aging.mockResolvedValue(report(true));
    renderTab();

    expect(await screen.findByText('Stock value')).toBeInTheDocument();
    expect(screen.getAllByText('$40.00').length).toBeGreaterThan(0);
  });
});
