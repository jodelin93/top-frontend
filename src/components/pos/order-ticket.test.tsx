import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order } from '@/lib/api/orders';
import { receiptToEscPos } from '@/lib/hardware/receipt-escpos';
import { Receipt } from './receipt';
import { orderToTicket } from './order-ticket';

// Amounts as printed (the currency sign's spacing depends on the locale)
const htg = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2 });

const order: Order = {
  id: 'o1',
  orderNumber: 'TOPPRINTING-CMD-000012',
  branchId: 'b1',
  registerId: 'r1',
  customerId: 'c1',
  customer: { id: 'c1', code: 'CUST-000001', customerType: 'individual', firstName: 'Marie', lastName: 'Joseph', companyName: null, email: null, phone: null } as Order['customer'],
  userId: 'u1',
  status: 'open',
  readyBy: '2026-10-28',
  subtotal: 10000,
  discountAmount: 0,
  taxAmount: 0,
  total: 10000,
  paidAmount: 4000,
  balanceDue: 6000,
  currencyCode: 'HTG',
  cartDiscount: null,
  groupDiscountPercent: 0,
  notes: null,
  readyAt: null,
  saleId: null,
  pickedUpAt: null,
  cancelledAt: null,
  cancelReason: null,
  depositOutcome: null,
  createdAt: '2026-10-24T14:00:00.000Z',
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      sku: 'BANNER',
      productName: 'Banner printing',
      variantName: null,
      quantity: 1,
      unitPrice: 10000,
      catalogPrice: 10000,
      discountPercent: 0,
      subtotal: 10000,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 10000,
      note: '2 x 1 m',
      lineNumber: 1,
    },
  ],
  payments: [
    {
      id: 'p1',
      createdAt: '2026-10-24T14:00:00.000Z',
      type: 'deposit',
      amount: 4000,
      paymentMethodId: 'cash',
      paymentMethod: { id: 'cash', code: 'CASH', name: { en: 'Cash' }, methodType: 'cash', requiresReference: false, opensDrawer: true, status: 'active' },
      reference: null,
      tenderedCurrency: null,
      tenderedAmount: null,
      exchangeRate: null,
      shiftId: 's1',
      userId: 'u1',
      note: null,
    },
  ],
};

describe('order receipt', () => {
  it('shows the total, the deposits paid and the balance due at pickup', () => {
    render(<Receipt sale={orderToTicket(order)} format="80mm" />);
    expect(screen.getByText('*** ORDER — NOT A SALE RECEIPT ***')).toBeInTheDocument();
    expect(screen.getByText('TOPPRINTING-CMD-000012')).toBeInTheDocument();
    const row = (label: string) => screen.getByText(label).parentElement!;
    expect(row('TOTAL')).toHaveTextContent(htg(10000));
    expect(row('Cash')).toHaveTextContent(htg(4000));
    expect(row('Deposits paid')).toHaveTextContent(htg(4000));
    expect(row('BALANCE DUE AT PICKUP')).toHaveTextContent(htg(6000));
    expect(screen.getByText('Ready by')).toBeInTheDocument();
  });

  it('prints the same on the thermal printer', () => {
    const bytes = receiptToEscPos(orderToTicket(order), undefined, { paper: 80 });
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('BALANCE DUE AT PICKUP');
    expect(text).toContain('Deposits paid');
  });
});
