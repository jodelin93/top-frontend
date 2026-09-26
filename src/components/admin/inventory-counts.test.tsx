import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockCountDetail } from '@/lib/api/inventory';
import { useAuthStore } from '@/stores/auth-store';
import { CountsTab } from './inventory-counts';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  enter: vi.fn(),
  submit: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/api/inventory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/inventory')>()),
  stockCountsApi: api,
}));
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  locationsApi: {
    list: () => Promise.resolve([{ id: 'l1', code: 'FLOOR', name: 'Floor', warehouseId: 'w1', isSellable: true }]),
  },
  warehousesApi: { list: () => Promise.resolve([{ id: 'w1', name: 'Shop' }]) },
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => ({ data: { countVarianceTolerance: 1 } }),
  useCurrency: () => 'USD',
}));

const detail = (overrides: Partial<StockCountDetail> = {}): StockCountDetail => ({
  id: 'c1',
  countNumber: 'CNT-000001',
  locationId: 'l1',
  categoryId: null,
  blind: true,
  status: 'in_progress',
  notes: null,
  createdById: 'u1',
  submittedById: null,
  submittedAt: null,
  approvedById: null,
  approvedAt: null,
  postedAt: null,
  cancelledAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  expectedHidden: true,
  summary: null,
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      sku: 'A-1',
      barcode: null,
      variantName: null,
      productName: { en: 'Widget A' },
      expectedQuantity: null,
      countedQuantity: null,
      variance: null,
      unitCost: null,
      countedAt: null,
    },
  ],
  ...overrides,
});

describe('CountsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'u@test',
        firstName: null,
        lastName: null,
        role: 'manager',
        permissions: ['inventory.count', 'inventory.view'],
        tenantId: 't',
        mfaEnabled: false,
      },
    });
  });

  it('hides expected quantities in a blind count and submits the entered counts', async () => {
    api.list.mockResolvedValue([{ ...detail(), lineCount: 1, countedCount: 0 }]);
    const submitted = detail({
      status: 'pending_approval',
      expectedHidden: false,
      items: [{ ...detail().items[0], expectedQuantity: 5, countedQuantity: 2, variance: -3 }],
      summary: {
        lines: 1,
        counted: 1,
        uncounted: 0,
        withVariance: 1,
        unitsOver: 0,
        unitsShort: 3,
        netUnits: -3,
        netValue: 0,
      },
    });
    // The sheet reloads after submitting
    api.get.mockResolvedValueOnce(detail()).mockResolvedValue(submitted);
    api.enter.mockResolvedValue(detail());
    api.submit.mockResolvedValue(submitted);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const user = userEvent.setup();
    render(<CountsTab />, { wrapper });

    await user.click(await screen.findByText('CNT-000001'));
    const input = await screen.findByRole('textbox', { name: 'Counted quantity for A-1' });
    expect(screen.queryByText('Expected')).not.toBeInTheDocument();

    await user.type(input, '2');
    await user.click(screen.getByRole('button', { name: 'Submit count' }));

    await waitFor(() => expect(api.enter).toHaveBeenCalledWith('c1', [{ variantId: 'v1', countedQuantity: 2 }]));
    expect(api.submit).toHaveBeenCalledWith('c1', expect.any(String));
    expect(await screen.findByText(/need approval/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve & post/i })).toBeInTheDocument();
  });

  it('shows the roll-forward per line once submitted: snapshot + movements while counting = expected at count', async () => {
    const posted = detail({
      status: 'posted',
      blind: false,
      expectedHidden: false,
      snapshotAt: '2026-09-01T08:00:00Z',
      postedAt: '2026-09-01T10:00:00Z',
      items: [
        {
          ...detail().items[0],
          expectedQuantity: 10,
          movementsSinceSnapshot: -3,
          expectedAtCount: 7,
          countedQuantity: 6,
          variance: -1,
          reason: 'Broken box',
        },
      ],
      summary: {
        lines: 1,
        counted: 1,
        uncounted: 0,
        withVariance: 1,
        unitsOver: 0,
        unitsShort: 1,
        netUnits: -1,
        netValue: 0,
      },
    });
    api.list.mockResolvedValue([{ ...posted, lineCount: 1, countedCount: 1 }]);
    api.get.mockResolvedValue(posted);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const user = userEvent.setup();
    render(<CountsTab />, { wrapper });

    await user.click(await screen.findByText('CNT-000001'));
    expect(await screen.findByText('Movements while counting')).toBeInTheDocument();
    expect(screen.getByText('Expected at count')).toBeInTheDocument();
    expect(screen.getByText(/Sales made while you counted are not variances/)).toBeInTheDocument();
    const row = screen.getByText('Broken box').closest('tr')!;
    const cells = [...row.querySelectorAll('td')].map((td) => td.textContent);
    // Product, snapshot, movements, expected at count, counted, variance, reason
    expect(cells.slice(1)).toEqual(['10', '-3', '7', '6', '-1', 'Broken box']);
  });

  it('saves a reason with the counted quantity while counting', async () => {
    api.list.mockResolvedValue([{ ...detail(), lineCount: 1, countedCount: 0 }]);
    api.get.mockResolvedValue(detail());
    api.enter.mockResolvedValue(detail());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const user = userEvent.setup();
    render(<CountsTab />, { wrapper });

    await user.click(await screen.findByText('CNT-000001'));
    await user.type(await screen.findByRole('textbox', { name: 'Counted quantity for A-1' }), '4');
    await user.type(screen.getByRole('textbox', { name: 'Reason for A-1' }), 'Found in the back');
    await user.click(screen.getByRole('button', { name: 'Save counts' }));

    await waitFor(() =>
      expect(api.enter).toHaveBeenCalledWith('c1', [
        { variantId: 'v1', countedQuantity: 4, reason: 'Found in the back' },
      ])
    );
  });
});
