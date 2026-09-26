import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseOrderDetail } from '@/lib/api/purchasing';
import { useAuthStore } from '@/stores/auth-store';
import { PurchaseOrderDetailDialog } from './purchasing-order-detail-dialog';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  receive: vi.fn(),
  approve: vi.fn(),
  submit: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@/lib/api/purchasing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/purchasing')>()),
  purchaseOrdersApi: api,
}));
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  locationsApi: { list: () => Promise.resolve([]) },
  warehousesApi: { list: () => Promise.resolve([]) },
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => ({ data: { storeName: 'Test Store' } }),
  useCurrency: () => 'USD',
}));

const order = (overrides: Partial<PurchaseOrderDetail> = {}): PurchaseOrderDetail => ({
  id: 'po-1',
  poNumber: 'PO-000001',
  supplierId: 's1',
  supplier: { name: 'Acme' } as PurchaseOrderDetail['supplier'],
  locationId: 'l1',
  orderDate: '2026-09-01T00:00:00Z',
  expectedDeliveryDate: null,
  subtotal: 60,
  taxAmount: 0,
  shippingCost: 0,
  total: 60,
  currencyCode: 'USD',
  userId: 'creator',
  notes: null,
  status: 'issued',
  submittedAt: null,
  approvedById: null,
  approvedAt: null,
  issuedAt: null,
  receivedAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: '2026-09-01T00:00:00Z',
  items: [
    {
      id: 'line-1',
      variantId: 'v1',
      sku: 'A-1',
      productName: 'Widget A',
      quantityOrdered: 10,
      quantityReceived: 4,
      unitCost: 5,
      subtotal: 50,
      total: 50,
      notes: null,
      lineNumber: 1,
    },
    {
      id: 'line-2',
      variantId: 'v2',
      sku: 'B-1',
      productName: 'Widget B',
      quantityOrdered: 4,
      quantityReceived: 4,
      unitCost: 2.5,
      subtotal: 10,
      total: 10,
      notes: null,
      lineNumber: 2,
    },
  ],
  receipts: [],
  createdByName: 'Creator',
  approvedByName: null,
  people: {},
  ...overrides,
});

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<PurchaseOrderDetailDialog id="po-1" onClose={vi.fn()} onEdit={vi.fn()} />, { wrapper });
}

describe('PurchaseOrderDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'receiver',
        email: 'r@test',
        firstName: null,
        lastName: null,
        role: 'manager',
        permissions: ['purchasing.manage', 'inventory.receive', 'purchasing.approve'],
        tenantId: 't',
        mfaEnabled: false,
      },
    });
  });

  it('receives only the outstanding lines and reuses the idempotency key on retry', async () => {
    api.get.mockResolvedValue(order());
    api.receive
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ duplicate: false, receipt: { receiptNumber: 'GRN-000001' }, purchaseOrder: {} });
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: /receive goods/i }));
    // Only the line with something outstanding, prefilled with what is left
    const quantity = screen.getByRole('textbox', { name: 'Received quantity for A-1' });
    expect(quantity).toHaveValue('6');
    expect(screen.queryByRole('textbox', { name: 'Received quantity for B-1' })).not.toBeInTheDocument();

    await user.clear(quantity);
    await user.type(quantity, '2');
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    await screen.findByText('Network Error');
    await user.click(screen.getByRole('button', { name: 'Receive' }));

    await waitFor(() => expect(api.receive).toHaveBeenCalledTimes(2));
    const [first, second] = api.receive.mock.calls.map((call) => call[1] as { idempotencyKey: string });
    expect(first).toMatchObject({ items: [{ purchaseOrderItemId: 'line-1', quantity: 2 }] });
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    await screen.findByText(/Received as GRN-000001/);
  });

  it('offers approval on an order waiting for it', async () => {
    api.get.mockResolvedValue(order({ status: 'pending_approval' }));
    api.approve.mockResolvedValue(
      order({ status: 'approved', approvedByName: 'Boss', approvedAt: '2026-09-02T00:00:00Z' })
    );
    const user = userEvent.setup();
    renderDialog();

    expect(await screen.findByText(/above the approval threshold/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /receive goods/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith('po-1', undefined));
    expect(await screen.findByText('Approved.')).toBeInTheDocument();
  });

  it('sends damaged units with the accept choice', async () => {
    api.get.mockResolvedValue(order());
    api.receive.mockResolvedValue({ duplicate: false, receipt: { receiptNumber: 'GRN-000002' }, purchaseOrder: {} });
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: /receive goods/i }));
    const good = screen.getByRole('textbox', { name: 'Received quantity for A-1' });
    await user.clear(good);
    await user.type(good, '4');
    await user.type(screen.getByRole('textbox', { name: 'Damaged quantity for A-1' }), '2');
    await user.click(screen.getByRole('checkbox', { name: 'Accept damaged units of A-1' }));
    await user.click(screen.getByRole('button', { name: 'Receive' }));

    await waitFor(() => expect(api.receive).toHaveBeenCalledTimes(1));
    expect(api.receive.mock.calls[0][1]).toMatchObject({
      items: [{ purchaseOrderItemId: 'line-1', quantity: 4, damagedQuantity: 2, damagedAccepted: true }],
    });
  });

  it('short-closes a partly received order with a reason', async () => {
    api.get.mockResolvedValue(order({ status: 'partially_received' }));
    api.close.mockResolvedValue(order({ status: 'closed', closeReason: 'Discontinued' }));
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Discontinued');
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Short-close' }));
    await waitFor(() => expect(api.close).toHaveBeenCalledWith('po-1', 'Discontinued'));
    expect(await screen.findByText('Order closed.')).toBeInTheDocument();
    prompt.mockRestore();
  });
});
