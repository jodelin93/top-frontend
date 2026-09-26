import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Sale } from '@/lib/api/sales';
import type { SaleReturn } from '@/lib/api/returns';
import type { Estimate } from '@/lib/api/estimates';
import type { StoreSettings } from '@/lib/api/settings';
import { ReturnReceipt } from '@/components/admin/returns-receipt';
import { EstimateDocument } from '@/components/admin/estimate-document';
import { Receipt } from './receipt';
import { consentedEmail, needsConsentConfirmation } from './receipt-share';

const customer = {
  id: 'c1',
  code: 'CUST-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  taxNumber: 'NIF-777',
  marketingEmailConsent: true,
  metadata: { address: { line1: '12 Rue Capois', city: 'Port-au-Prince', country: 'Haïti' } },
} as unknown as NonNullable<Sale['customer']>;

const sale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 's1',
    saleNumber: 'S-000123',
    saleDate: '2026-09-24T10:15:00.000Z',
    subtotal: 30,
    discountAmount: 0,
    taxAmount: 3,
    total: 33,
    amountPaid: 33,
    changeAmount: 0,
    currencyCode: 'USD',
    status: 'completed',
    items: [{ id: 'i1', variantId: 'v', sku: 'CAF', productName: 'Coffee', variantName: null, quantity: 2, unitPrice: 15, subtotal: 30, discountAmount: 0, taxAmount: 3, total: 33, lineNumber: 1, taxRate: 10 }],
    payments: [],
    customer,
    ...overrides,
  }) as Sale;

const settings = { storeName: 'Corner Shop', receiptFormat: 'a4', businessTaxId: 'NIF-001' } as StoreSettings;

describe('invoice (A4 / Letter)', () => {
  it('shows the buyer: name, address and tax id', () => {
    const { container } = render(<Receipt sale={sale()} settings={settings} />);
    expect(container.querySelector('.print-receipt')).toHaveAttribute('data-format', 'a4');
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Bill to')).toBeInTheDocument();
    expect(screen.getByText(/12 Rue Capois/)).toBeInTheDocument();
    expect(screen.getByText('Tax no. NIF-777')).toBeInTheDocument();
  });

  it('prints on US Letter paper when chosen', () => {
    const { container } = render(<Receipt sale={sale()} settings={{ ...settings, receiptFormat: 'letter' }} />);
    const page = container.querySelector('.print-receipt');
    expect(page).toHaveAttribute('data-format', 'letter');
    expect(page).toHaveClass('receipt-letter');
  });

  it('stays a thermal receipt without buyer block on 80 mm', () => {
    render(<Receipt sale={sale()} settings={{ ...settings, receiptFormat: '80mm' }} />);
    expect(screen.queryByText('Bill to')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoice')).not.toBeInTheDocument();
  });
});

const saleReturn = {
  id: 'r1',
  returnNumber: 'R-000045',
  originalSaleId: 's1',
  reason: 'Damaged',
  subtotal: 15,
  discountAmount: 0,
  taxAmount: 1.5,
  total: 16.5,
  currencyCode: 'USD',
  status: 'completed',
  createdAt: '2026-09-25T09:00:00.000Z',
  items: [{ id: 'ri1', productName: 'Coffee', variantName: null, quantity: 1, unitPrice: 15, total: 16.5, disposition: 'restock' }],
  refunds: [],
  originalSale: sale(),
} as unknown as SaleReturn;

describe('credit note', () => {
  it('has its own title and number, and refers to the original invoice', () => {
    render(<ReturnReceipt saleReturn={saleReturn} settings={{ ...settings, receiptFormat: '80mm' }} />);
    expect(screen.getByTestId('credit-note-title')).toHaveTextContent('Credit note');
    expect(screen.getByText('No. R-000045')).toBeInTheDocument();
    expect(screen.getByText(/Refers to invoice S-000123/)).toBeInTheDocument();
    expect(screen.getByText('CREDIT TOTAL')).toBeInTheDocument();
    expect(screen.queryByTestId('receipt-copy')).not.toBeInTheDocument();
  });

  it('uses the A4 layout with the buyer for invoice stores, and labels copies', () => {
    const { container } = render(<ReturnReceipt saleReturn={saleReturn} settings={settings} copy={2} />);
    expect(container.querySelector('[data-document="credit_note"]')).toHaveAttribute('data-format', 'a4');
    expect(screen.getByText('Credited to')).toBeInTheDocument();
    expect(screen.getByTestId('receipt-copy')).toHaveTextContent('COPY #2');
  });
});

const estimate = {
  id: 'e1',
  estimateNumber: 'Q-000009',
  issueDate: '2026-09-01',
  validUntil: '2026-09-30',
  currencyCode: 'USD',
  subtotal: 30,
  discountAmount: 0,
  taxAmount: 3,
  total: 33,
  customer,
  customerName: null,
  items: [],
  notes: null,
  terms: null,
} as unknown as Estimate;

describe('pro forma', () => {
  it('prints the estimate as a PRO FORMA invoice when asked', () => {
    const { container, rerender } = render(<EstimateDocument estimate={estimate} settings={settings} />);
    expect(screen.getByText('Estimate')).toBeInTheDocument();
    rerender(<EstimateDocument estimate={estimate} settings={settings} proForma />);
    expect(screen.getByText('Pro forma invoice')).toBeInTheDocument();
    expect(screen.getByText(/not a tax invoice/)).toBeInTheDocument();
    expect(container.querySelector('[data-document="pro_forma"]')).not.toBeNull();
  });
});

describe('e-mail consent', () => {
  it("prefills the customer's address and always asks the cashier to confirm", () => {
    expect(consentedEmail(sale())).toBe('ada@example.com');
    // Marketing consent is not consent to receipts (the server asks every time)
    expect(needsConsentConfirmation(sale(), 'ADA@example.com')).toBe(true);
    expect(needsConsentConfirmation(sale(), 'other@example.com')).toBe(true);
    const noConsent = sale({ customer: { ...customer, marketingEmailConsent: false } });
    expect(consentedEmail(noConsent)).toBe('ada@example.com');
    expect(needsConsentConfirmation(noConsent, 'ada@example.com')).toBe(true);
  });
});
