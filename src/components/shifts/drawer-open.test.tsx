import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZReport } from '@/lib/api/shifts';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { DrawerOpenButton } from './drawer-open-button';
import { ZReportView } from './z-report';

const shifts = vi.hoisted(() => ({ current: vi.fn(), drawerOpen: vi.fn() }));
const drawer = vi.hoisted(() => ({ kickDrawer: vi.fn() }));

vi.mock('@/lib/api/shifts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/shifts')>();
  return { ...actual, shiftsApi: { ...actual.shiftsApi, ...shifts } };
});
vi.mock('@/lib/pos/drawer', () => drawer);

const usd = (value: number) => formatMoney(value, 'USD');

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DrawerOpenButton registerId="reg-1" />, { wrapper });
}

describe('DrawerOpenButton (no sale)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', permissions: ['shifts.operate'] } as never,
    });
    shifts.current.mockResolvedValue({
      shift: { id: 'shift-1', shiftNumber: 'SH-000001', status: 'open' },
    });
    shifts.drawerOpen.mockResolvedValue({ id: 'mv-1', type: 'no_sale', amount: 0 });
  });

  it('records the opening with its reason, then kicks the drawer', async () => {
    drawer.kickDrawer.mockResolvedValue({ supported: false, opened: false, error: null });
    const user = userEvent.setup();
    renderButton();

    await user.click(await screen.findByRole('button', { name: /Open drawer/ }));
    const record = screen.getByRole('button', { name: 'Record and open' });
    // The reason is required
    expect(record).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), 'Change for a customer');
    await user.click(record);

    await waitFor(() =>
      expect(shifts.drawerOpen).toHaveBeenCalledWith('shift-1', {
        reason: 'Change for a customer',
        idempotencyKey: expect.any(String),
      })
    );
    expect(drawer.kickDrawer).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Recorded. No hardware connected: open the drawer with its key.')).toBeInTheDocument();
  });

  it('is hidden without an open shift', async () => {
    shifts.current.mockResolvedValue({ shift: null });
    const { container } = renderButton();
    await waitFor(() => expect(shifts.current).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

const closedReport: ZReport = {
  generatedAt: '2026-09-25T09:00:00.000Z',
  final: true,
  shift: {
    id: 's1',
    shiftNumber: 'SH-000008',
    status: 'closed',
    registerId: 'r1',
    registerName: 'Till 1',
    currencyCode: 'USD',
    openedAt: '2026-09-24T08:00:00.000Z',
    openedBy: 'Ana Cashier',
    closedAt: '2026-09-24T17:55:00.000Z',
    closedBy: 'Ana Cashier',
    approvedBy: null,
    blindCount: false,
    forceClosed: false,
    businessDate: '2026-09-24',
  },
  sales: { count: 1, total: 19.8, voidedCount: 0, voidedTotal: 0, byPaymentMethod: [] },
  cash: {
    openingFloat: 100,
    cashSales: 20,
    changeGiven: 0.2,
    paidIn: 0,
    paidOut: 0,
    safeDrops: 50,
    expensePayouts: 0,
    cashRefunds: 0,
    expected: 69.8,
  },
  movements: [
    {
      id: 'm1',
      type: 'no_sale',
      amount: 0,
      reason: 'Change for a customer',
      reference: null,
      createdAt: '2026-09-24T12:00:00Z',
      user: 'Ana',
    },
  ],
  count: { denominations: null, counted: 64.8 },
  variance: { expected: 69.8, counted: 64.8, variance: -5, tolerance: 5, overTolerance: false, reason: null },
  notes: null,
  corrections: {
    corrections: [
      {
        id: 'c1',
        type: 'expected',
        amount: -5,
        reason: 'Unrecorded paid-out',
        createdAt: '2026-09-25T08:00:00.000Z',
        createdBy: 'Max Manager',
        approvedBy: 'Max Manager',
      },
    ],
    expectedAdjustment: -5,
    countedAdjustment: 0,
    expected: 64.8,
    counted: 64.8,
    variance: 0,
  },
};

describe('ZReportView supplements', () => {
  it('shows the business date, no-sale openings and the corrections after close', () => {
    render(<ZReportView report={closedReport} />);
    expect(screen.getByText('Business date').nextSibling).toHaveTextContent('2026-09-24');
    // The frozen expected cash stays as closed (float 100 + 20 − 0.20 − safe drop 50)
    expect(screen.getByText('Expected in drawer').nextSibling).toHaveTextContent(usd(69.8));
    expect(screen.getByText(/No sale \(drawer opened\)/).nextSibling).toHaveTextContent('—');
    expect(screen.getByText('Corrections after close')).toBeInTheDocument();
    expect(screen.getByText('Expected cash correction').nextSibling).toHaveTextContent(usd(-5));
    expect(screen.getByText('Corrected variance').nextSibling).toHaveTextContent(usd(0));
  });
});
