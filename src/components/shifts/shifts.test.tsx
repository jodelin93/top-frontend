import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { countTotal, type ZReport } from '@/lib/api/shifts';
import { formatMoney } from '@/lib/format';
import { countsFromState, CountState, DenominationCountForm } from './denomination-count';
import { ZReportView } from './z-report';

const usd = (value: number) => formatMoney(value, 'USD');

describe('cash count helpers', () => {
  it('totals a denomination count without floating point drift', () => {
    expect(
      countTotal([
        { value: 0.1, quantity: 3 },
        { value: 0.2, quantity: 1 },
        { value: 20, quantity: 2 },
      ])
    ).toBe(40.5);
  });

  it('turns typed quantities into counts and skips empty ones', () => {
    expect(countsFromState([100, 20, 0.25], { '20': '3', '0.25': '', '100': '0' })).toEqual([
      { value: 20, quantity: 3 },
    ]);
  });
});

function CountHarness() {
  const [value, setValue] = useState<CountState>({});
  return <DenominationCountForm denominations={[20, 5, 0.25]} value={value} onChange={setValue} currency="USD" />;
}

describe('DenominationCountForm', () => {
  it('shows a running total as quantities are typed', () => {
    render(<CountHarness />);
    fireEvent.change(screen.getByLabelText(`Number of ${usd(20)}`), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(`Number of ${usd(0.25)}`), { target: { value: '3x' } });
    expect(screen.getByTestId('count-total')).toHaveTextContent(usd(40.75));
  });
});

const report: ZReport = {
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
    openedBy: 'Ana Cashier',
    closedAt: '2026-09-24T17:55:00.000Z',
    closedBy: 'Ana Cashier',
    approvedBy: 'Max Manager',
    blindCount: true,
    forceClosed: false,
  },
  sales: {
    count: 3,
    total: 75,
    voidedCount: 1,
    voidedTotal: 20,
    byPaymentMethod: [{ paymentMethodId: 'pm1', name: 'Cash', methodType: 'cash', count: 2, amount: 60 }],
  },
  cash: {
    openingFloat: 100,
    cashSales: 60,
    changeGiven: 10,
    paidIn: 0,
    paidOut: 0,
    safeDrops: 20,
    expensePayouts: 0,
    cashRefunds: 0,
    expected: 130,
  },
  movements: [
    {
      id: 'm1',
      type: 'safe_drop',
      amount: 20,
      reason: 'midday',
      reference: null,
      createdAt: '2026-09-24T12:00:00Z',
      user: 'Max',
    },
  ],
  count: { denominations: [{ value: 20, quantity: 6 }], counted: 120 },
  variance: { expected: 130, counted: 120, variance: -10, tolerance: 5, overTolerance: true, reason: 'short change' },
  notes: null,
};

describe('ZReportView', () => {
  it('prints the drawer maths, the count and the variance', () => {
    render(<ZReportView report={report} storeName="Corner Shop" />);
    expect(screen.getByText('Z-REPORT')).toBeInTheDocument();
    expect(screen.getByText('Expected in drawer').nextSibling).toHaveTextContent(usd(130));
    expect(screen.getByText('Variance').nextSibling).toHaveTextContent(usd(-10));
    expect(screen.getByText('Approved by').nextSibling).toHaveTextContent('Max Manager');
    expect(screen.getByText('Reason: short change')).toBeInTheDocument();
    expect(screen.queryByTestId('z-report-copy')).toBeNull();
  });

  it('says COPY on a reprint', () => {
    render(<ZReportView report={report} copy={2} />);
    expect(screen.getByTestId('z-report-copy')).toHaveTextContent('*** COPY #2 — NOT AN ORIGINAL ***');
  });
});
