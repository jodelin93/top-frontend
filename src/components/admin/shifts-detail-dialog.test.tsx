import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShiftDetail, ZReport } from '@/lib/api/shifts';
import { ShiftDetailDialog } from './shifts-detail-dialog';

const mocks = vi.hoisted(() => ({ get: vi.fn(), zReport: vi.fn(), printDocument: vi.fn() }));

vi.mock('@/lib/api/shifts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/shifts')>();
  return { ...original, shiftsApi: { ...original.shiftsApi, get: mocks.get, zReport: mocks.zReport } };
});
vi.mock('@/lib/hardware/print-manager', () => ({ printDocument: mocks.printDocument }));

const shift = {
  id: 's1',
  shiftNumber: 'SH-000007',
  status: 'closed',
  registerId: 'r1',
  registerName: 'Till 1',
  currencyCode: 'USD',
  openedById: 'u1',
  openedByName: 'Ana',
  openedAt: '2026-09-24T08:00:00.000Z',
  openingFloat: 100,
  blindCount: false,
  closingStartedAt: null,
  closedById: 'u1',
  closedByName: 'Ana',
  closedAt: '2026-09-24T17:55:00.000Z',
  countedCash: 130,
  expectedCash: 130,
  variance: 0,
  varianceReason: null,
  forceClosed: false,
  openingDenominations: null,
  closingDenominations: null,
  openingNotes: null,
  closingNotes: null,
  closeApprovedById: null,
  cash: null,
  sales: null,
  movements: [],
} as unknown as ShiftDetail;

const report = {
  generatedAt: '2026-09-24T18:00:00.000Z',
  final: true,
  shift: {
    id: 's1',
    shiftNumber: 'SH-000007',
    status: 'closed',
    registerId: 'r1',
    registerName: 'Till 1',
    currencyCode: 'USD',
    openedAt: '2026-09-24T08:00:00.000Z',
    openedBy: 'Ana',
    closedAt: '2026-09-24T17:55:00.000Z',
    closedBy: 'Ana',
    approvedBy: null,
    blindCount: false,
    forceClosed: false,
  },
  sales: { count: 0, total: 0, voidedCount: 0, voidedTotal: 0, byPaymentMethod: [] },
  cash: {
    openingFloat: 100,
    cashSales: 30,
    changeGiven: 0,
    paidIn: 0,
    paidOut: 0,
    safeDrops: 0,
    expensePayouts: 0,
    cashRefunds: 0,
    expected: 130,
  },
  movements: [],
  count: { denominations: [], counted: 130 },
  variance: { expected: 130, counted: 130, variance: 0, tolerance: 5, overTolerance: false, reason: null },
  notes: null,
} as unknown as ZReport;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('ShiftDetailDialog Z-report printing', () => {
  beforeEach(() => {
    mocks.get.mockResolvedValue(shift);
    mocks.zReport.mockResolvedValue(report);
    mocks.printDocument.mockReset().mockResolvedValue({ status: 'printed' });
  });

  it('prints a closed shift through the print manager (recorded print job)', async () => {
    render(<ShiftDetailDialog shiftId="s1" onClose={vi.fn()} />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Z-report' }));
    await screen.findByText('Z-REPORT');
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(mocks.printDocument).toHaveBeenCalledTimes(1));
    expect(mocks.printDocument.mock.calls[0][0]).toMatchObject({ documentType: 'z_report', documentId: 's1', copy: false });
  });
});
