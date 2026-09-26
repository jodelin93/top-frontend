import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockTransfer, TransferItem } from '@/lib/api/inventory';
import { useAuthStore } from '@/stores/auth-store';
import { overReceiptAllowance, planReceive } from './inventory-transfer-receive';
import { TransfersTab } from './inventory-transfers';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  request: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  dispatch: vi.fn(),
  receive: vi.fn(),
  writeOff: vi.fn(),
  cancel: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/lib/api/inventory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/inventory')>()),
  transfersApi: api,
}));
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  locationsApi: {
    list: () =>
      Promise.resolve([
        { id: 'l1', code: 'BACK', name: 'Back', warehouseId: 'w1', isSellable: true, stockStatus: 'sellable' },
        { id: 'l2', code: 'SHOP', name: 'Shop', warehouseId: 'w1', isSellable: true, stockStatus: 'sellable' },
      ]),
  },
  warehousesApi: { list: () => Promise.resolve([{ id: 'w1', name: 'Main' }]) },
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => ({
    data: { transferApprovalMode: 'never', transferApprovalThreshold: 0, transferOverReceiptTolerancePercent: 10 },
  }),
  useCurrency: () => 'USD',
}));

const line = (overrides: Partial<TransferItem> = {}): TransferItem => ({
  id: 'i1',
  variantId: 'v1',
  quantityRequested: 10,
  quantityDispatched: 10,
  quantityReceived: 0,
  quantityWrittenOff: 0,
  quantityDamaged: 0,
  quantityMissing: 0,
  quantityReturned: 0,
  quantityOverReceived: 0,
  quantityInTransit: 10,
  unitCost: null,
  variant: { id: 'v1', sku: 'A-1', name: null, product: { name: { en: 'Widget' } } },
  ...overrides,
});

const entry = (good: string, damaged = '', missing = '') => ({ good, damaged, missing });

describe('planReceive', () => {
  it('accepts good + damaged + missing up to what is in transit', () => {
    const plan = planReceive([line()], { i1: entry('7', '2', '1') });
    expect(plan).toEqual({
      lines: [{ itemId: 'i1', quantity: 7, damaged: 2, missing: 1 }],
      over: {},
      needsApproval: false,
    });
  });

  it('refuses more than in transit when some are reported missing', () => {
    const plan = planReceive([line()], { i1: entry('8', '2', '1') });
    expect(plan).toEqual({ error: 'A-1: good + damaged + missing cannot exceed the 10 in transit.' });
  });

  it('treats more arriving than in transit as an over-receipt, with approval above the tolerance', () => {
    const within = planReceive([line()], { i1: entry('11') }, 10);
    expect(within).toMatchObject({ over: { i1: 1 }, needsApproval: false });
    const above = planReceive([line()], { i1: entry('10', '2') }, 10);
    expect(above).toMatchObject({ over: { i1: 2 }, needsApproval: true });
    // Nothing can be missing when more arrived than was sent
    expect(planReceive([line()], { i1: entry('11', '', '1') }, 10)).toHaveProperty('error');
  });

  it('counts units still in transit after earlier receipts and rejects bad input', () => {
    const item = line({ quantityReceived: 6, quantityDamaged: 1, quantityInTransit: 3 });
    expect(planReceive([item], { i1: entry('3', '', '1') })).toHaveProperty('error');
    expect(planReceive([item], { i1: entry('x') })).toEqual({
      error: 'Quantities must be 0 or more, with at most 4 decimals (A-1).',
    });
    // Measured items (kg) take decimals; the server checks the unit's precision
    expect(planReceive([item], { i1: entry('1.25') })).toMatchObject({ lines: [{ itemId: 'i1', quantity: 1.25 }] });
    expect(planReceive([item], { i1: entry('0') })).toEqual({ error: 'Enter at least one quantity.' });
  });

  it('allows over-receipt up to the tolerance minus what was already over-received', () => {
    expect(overReceiptAllowance(line(), 10)).toBe(1);
    expect(overReceiptAllowance(line({ quantityDispatched: 21, quantityOverReceived: 1 }), 10)).toBe(1);
    expect(overReceiptAllowance(line(), 0)).toBe(0);
  });
});

const transfer = (overrides: Partial<StockTransfer> = {}): StockTransfer => ({
  id: 't1',
  transferNumber: 'TRF-000001',
  fromLocationId: 'l1',
  toLocationId: 'l2',
  status: 'in_transit',
  notes: null,
  createdById: 'u1',
  dispatchedAt: '2026-09-01T00:00:00Z',
  receivedAt: null,
  cancelledAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  items: [line()],
  events: [
    {
      id: 'e1',
      kind: 'dispatch',
      idempotencyKey: 'k',
      userId: 'u1',
      approverId: null,
      lines: [{ itemId: 'i1', variantId: 'v1', quantity: 10 }],
      notes: null,
      createdAt: '2026-09-01T00:00:00Z',
    },
  ],
  ...overrides,
});

describe('TransfersTab receive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'u@test',
        firstName: null,
        lastName: null,
        role: 'manager',
        permissions: ['inventory.view', 'inventory.transfer'],
        tenantId: 't',
        mfaEnabled: false,
      },
    });
  });

  it('records good, damaged and missing units with an idempotency key', async () => {
    api.list.mockResolvedValue([transfer()]);
    api.get.mockResolvedValue(transfer());
    api.receive.mockResolvedValue(transfer({ status: 'partially_received' }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const user = userEvent.setup();
    render(<TransfersTab />, { wrapper });

    await user.click(await screen.findByText('TRF-000001'));
    // History of the dispatch
    expect(await screen.findByText('A-1 ×10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Receive...' }));

    const good = screen.getByRole('textbox', { name: 'Good quantity for A-1' });
    expect(good).toHaveValue('10');
    await user.type(screen.getByRole('textbox', { name: 'Damaged quantity for A-1' }), '2');
    // 10 + 2 is an over-receipt, above the 10% tolerance
    expect(screen.getByText(/A manager with/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Missing quantity for A-1' }), '1');
    expect(screen.getByRole('alert')).toHaveTextContent('no units can be missing');

    await user.clear(good);
    await user.type(good, '7');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Receive' }));

    await waitFor(() => expect(api.receive).toHaveBeenCalledTimes(1));
    const [id, input] = api.receive.mock.calls[0];
    expect(id).toBe('t1');
    expect(input.items).toEqual([{ itemId: 'i1', quantity: 7, damaged: 2, missing: 1 }]);
    expect(input.idempotencyKey).toEqual(expect.any(String));
  });
});
