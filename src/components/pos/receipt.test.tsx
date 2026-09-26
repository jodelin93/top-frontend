import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Sale } from '@/lib/api/sales';
import type { PaymentMethod, StoreSettings } from '@/lib/api/settings';
import { formatMoney } from '@/lib/format';
import { Receipt } from './receipt';

const usd = (value: number) => formatMoney(value, 'USD');

const paymentMethod = (id: string, name: string, methodType: PaymentMethod['methodType']): PaymentMethod => ({
  id,
  code: name.toUpperCase(),
  name: { en: name },
  methodType,
  requiresReference: false,
  opensDrawer: false,
  status: 'active',
});

const baseSale = (overrides: Partial<Sale> = {}): Sale => ({
  id: 'sale-1',
  saleNumber: 'S-000123',
  branchId: 'b1',
  registerId: 'r1',
  customerId: null,
  userId: 'u1',
  saleDate: '2026-09-24T10:15:00.000Z',
  subtotal: 50,
  discountAmount: 5,
  taxAmount: 4.5,
  total: 49.5,
  amountPaid: 60,
  changeAmount: 10.5,
  currencyCode: 'USD',
  notes: null,
  status: 'completed',
  items: [
    {
      id: 'i1',
      variantId: 'v1',
      sku: 'COF-L',
      productName: 'Coffee',
      variantName: 'Large',
      quantity: 2,
      unitPrice: 15,
      subtotal: 30,
      discountAmount: 5,
      taxAmount: 2.5,
      total: 27.5,
      lineNumber: 1,
    },
    {
      id: 'i2',
      variantId: 'v2',
      sku: 'MUG',
      productName: 'Mug',
      variantName: null,
      quantity: 1,
      unitPrice: 20,
      subtotal: 20,
      discountAmount: 0,
      taxAmount: 2,
      total: 22,
      lineNumber: 2,
    },
  ],
  payments: [
    {
      id: 'p1',
      paymentMethodId: 'pm-card',
      amount: 20,
      reference: 'AUTH42',
      status: 'completed',
      paymentMethod: paymentMethod('pm-card', 'Card', 'card'),
    },
    {
      id: 'p2',
      paymentMethodId: 'pm-cash',
      amount: 40,
      reference: null,
      status: 'completed',
      paymentMethod: paymentMethod('pm-cash', 'Cash', 'cash'),
    },
  ],
  register: { id: 'r1', branchId: 'b1', code: 'R1', name: 'Front till', defaultLocationId: null, status: 'active' },
  user: { id: 'u1', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
  ...overrides,
});

const settings = {
  storeName: 'Corner Shop',
  currencyCode: 'USD',
  pricesIncludeTax: false,
  defaultTaxRateId: null,
  receiptHeader: 'Welcome!',
  receiptFooter: 'Thanks for shopping',
  lowStockThreshold: 5,
  maxDiscountPercent: 20,
  receiptFormat: '80mm',
  heldCartExpiryHours: 24,
  requireOpenShift: false,
  returnWindowDays: 30,
  shiftVarianceTolerance: 5,
  expenseApprovalThreshold: 0,
  costingMethod: 'average',
  purchaseApprovalThreshold: 0,
  countVarianceTolerance: 0,
  offlineLeaseHours: 24,
  requireMfaForAdmins: false,
} as StoreSettings;

// Each <Row> is a flex container with a label span and a value span
const row = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement!;

describe('Receipt', () => {
  it('renders the store header, lines, line discounts, totals, payments and change', () => {
    render(<Receipt sale={baseSale()} settings={settings} />);

    expect(screen.getByText('Corner Shop')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Thanks for shopping')).toBeInTheDocument();
    expect(screen.getByText('S-000123')).toBeInTheDocument();
    expect(screen.getByText('Register: Front till')).toBeInTheDocument();
    expect(screen.getByText('Cashier: Grace Hopper')).toBeInTheDocument();

    // Lines
    expect(screen.getByText('Coffee (Large)')).toBeInTheDocument();
    expect(screen.getByText(`2 × ${usd(15)}`)).toBeInTheDocument();
    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText(`1 × ${usd(20)}`)).toBeInTheDocument();
    // Only the discounted line shows a discount row
    expect(screen.getAllByText('Discount')).toHaveLength(1);
    expect(within(row('Discount')).getByText(`-${usd(5)}`)).toBeInTheDocument();

    // Totals
    expect(row('Subtotal')).toHaveTextContent(usd(50));
    expect(row('Discounts')).toHaveTextContent(`-${usd(5)}`);
    expect(row('Tax')).toHaveTextContent(usd(4.5));
    expect(row('TOTAL')).toHaveTextContent(usd(49.5));

    // Payments and change
    expect(row('Card #AUTH42')).toHaveTextContent(usd(20));
    expect(row('Cash')).toHaveTextContent(usd(40));
    expect(row('Change')).toHaveTextContent(usd(10.5));

    expect(screen.queryByText(/VOIDED/)).not.toBeInTheDocument();
  });

  it('labels tax as included and hides zero discounts and change', () => {
    render(
      <Receipt
        sale={baseSale({ discountAmount: 0, changeAmount: 0, items: [], payments: [] })}
        settings={{ ...settings, pricesIncludeTax: true }}
      />
    );

    expect(screen.getByText('Tax (included)')).toBeInTheDocument();
    expect(screen.queryByText('Discounts')).not.toBeInTheDocument();
    expect(screen.queryByText('Change')).not.toBeInTheDocument();
  });

  it('marks a voided sale', () => {
    render(<Receipt sale={baseSale({ status: 'voided' })} settings={settings} />);
    expect(screen.getByText('*** VOIDED ***')).toBeInTheDocument();
  });
});

describe('Receipt formats, copies and offline numbers', () => {
  it('follows the store receipt format', () => {
    const { container, rerender } = render(<Receipt sale={baseSale()} settings={{ ...settings, receiptFormat: '58mm' }} />);
    expect(container.querySelector('.print-receipt')).toHaveAttribute('data-format', '58mm');
    rerender(<Receipt sale={baseSale()} settings={{ ...settings, receiptFormat: 'a4' }} />);
    expect(container.querySelector('.print-receipt')).toHaveAttribute('data-format', 'a4');
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Unit price' })).toBeInTheDocument();
  });

  it('prints the original without a COPY mark and reprints with one', () => {
    const { rerender } = render(<Receipt sale={baseSale()} settings={settings} />);
    expect(screen.queryByTestId('receipt-copy')).not.toBeInTheDocument();
    rerender(<Receipt sale={baseSale()} settings={settings} copy={2} />);
    expect(screen.getAllByTestId('receipt-copy')[0]).toHaveTextContent('COPY #2');
  });

  it('shows the provisional offline number next to the final one', () => {
    render(<Receipt sale={baseSale({ offlineNumber: 'OFFLINE-1A2B3C4D' })} settings={settings} />);
    expect(screen.getByText('S-000123')).toBeInTheDocument();
    expect(screen.getByText('Offline no. OFFLINE-1A2B3C4D')).toBeInTheDocument();
  });

  it('shows price overrides and a tax line per rate', () => {
    const sale = baseSale();
    sale.items = sale.items!.map((item, i) => ({
      ...item,
      taxRate: i === 0 ? 5 : 10,
      originalUnitPrice: i === 0 ? 18 : null,
    }));
    render(<Receipt sale={sale} settings={settings} />);
    expect(screen.getByText(`Price changed from ${usd(18)}`)).toBeInTheDocument();
    expect(row('Tax 5%')).toHaveTextContent(usd(2.5));
    expect(row('Tax 10%')).toHaveTextContent(usd(2));
  });

  it('prints the business details, logo and a barcode of the sale number', () => {
    render(
      <Receipt
        sale={baseSale()}
        settings={{
          ...settings,
          businessLegalName: 'Corner Shop LLC',
          businessAddressLine1: '12 Main St',
          businessCity: 'Springfield',
          businessTaxId: 'TX-999',
          businessLogoUrl: 'https://example.com/logo.png',
        }}
      />
    );
    expect(screen.getByText('Corner Shop LLC')).toBeInTheDocument();
    expect(screen.getByText('12 Main St')).toBeInTheDocument();
    expect(screen.getByText('Tax no. TX-999')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Barcode S-000123' })).toBeInTheDocument();
  });

  it('hides what the receipt options turn off', () => {
    render(
      <Receipt
        sale={baseSale()}
        settings={{ ...settings, receiptShowCashier: false, receiptShowBarcode: false, businessTaxId: 'TX-1', receiptShowBusinessDetails: false }}
      />
    );
    expect(screen.queryByText('Cashier: Grace Hopper')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Barcode/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Tax no. TX-1')).not.toBeInTheDocument();
  });

  it('uses the chosen receipt model', () => {
    const { container } = render(<Receipt sale={baseSale()} settings={{ ...settings, receiptTemplate: 'compact' }} />);
    expect(container.querySelector('.print-receipt')).toHaveAttribute('data-template', 'compact');
    // Compact puts each item on one line and drops the subtotal row
    expect(screen.queryByText('Subtotal')).not.toBeInTheDocument();
  });
});

describe('Receipt snapshot, salesperson and line notes', () => {
  const snapshot = {
    version: 1 as const,
    capturedAt: '2026-09-24T10:15:00.000Z',
    storeName: 'Corner Shop (old name)',
    businessLegalName: 'Old Legal SARL',
    businessAddressLine1: '1 Old Road',
    businessAddressLine2: '',
    businessCity: 'Jacmel',
    businessState: '',
    businessPostalCode: '',
    businessCountry: '',
    businessPhone: '',
    businessEmail: '',
    businessWebsite: '',
    businessTaxId: 'OLD-TAX',
    businessRegistrationNumber: '',
    businessLogoUrl: '',
    receiptHeader: 'Old header',
    receiptFooter: 'Old footer',
    returnPolicy: '',
    receiptTemplate: 'classic' as const,
    receiptFormat: '58mm' as const,
    pricesIncludeTax: false,
    branch: {
      id: 'b1',
      code: 'MAIN',
      name: 'Main',
      addressLine1: null,
      addressLine2: null,
      city: null,
      stateProvince: null,
      postalCode: null,
      countryCode: null,
      phone: null,
      email: null,
      taxNumber: null,
    },
  };
  const current = {
    ...settings,
    storeName: 'Corner Shop (new name)',
    businessTaxId: 'NEW-TAX',
    receiptFooter: 'New footer',
  } as StoreSettings;

  it('reprints with the seller identity frozen on the sale, not the current settings', () => {
    const { container } = render(
      <Receipt sale={baseSale({ documentSnapshot: snapshot })} settings={current} copy={1} />
    );
    expect(screen.getByText('Corner Shop (old name)')).toBeInTheDocument();
    expect(screen.getByText('Old Legal SARL')).toBeInTheDocument();
    expect(screen.getByText('Tax no. OLD-TAX')).toBeInTheDocument();
    expect(screen.getByText('Old footer')).toBeInTheDocument();
    expect(screen.queryByText('Corner Shop (new name)')).not.toBeInTheDocument();
    expect(screen.queryByText('New footer')).not.toBeInTheDocument();
    // The format it was printed in
    expect(container.querySelector('[data-format]')).toHaveAttribute('data-format', '58mm');
  });

  it('falls back to the current settings for sales without a snapshot', () => {
    render(<Receipt sale={baseSale()} settings={current} />);
    expect(screen.getByText('Corner Shop (new name)')).toBeInTheDocument();
    expect(screen.getByText('Tax no. NEW-TAX')).toBeInTheDocument();
  });

  it('shows the salesperson, line notes and discount reasons', () => {
    const sale = baseSale({
      salesperson: { id: 'u2', firstName: 'Rose', lastName: 'Paul', email: 'rose@example.com' },
      metadata: { cartDiscountReason: 'Loyal customer' },
    });
    sale.items![0] = { ...sale.items![0], notes: 'Gift wrapped', metadata: { discountReason: 'Damaged box' } };
    render(<Receipt sale={sale} settings={settings} />);
    expect(screen.getByText('Salesperson: Rose Paul')).toBeInTheDocument();
    expect(screen.getByText('Gift wrapped')).toBeInTheDocument();
    expect(screen.getByText(/Damaged box/)).toBeInTheDocument();
    expect(screen.getByText('Discount reason: Loyal customer')).toBeInTheDocument();
  });
});

describe('Receipt: measured (weighed) lines', () => {
  const weighed = baseSale({
    items: [
      {
        id: 'w1',
        variantId: 'apples',
        sku: 'APL',
        productName: 'Apples',
        variantName: null,
        quantity: 1.25,
        unitPrice: 3.99,
        subtotal: 4.99,
        discountAmount: 0,
        taxAmount: 0,
        total: 4.99,
        lineNumber: 1,
        metadata: { unit: 'kg', unitPrecision: 3 },
      },
    ],
  });

  it('shows the weight with its unit and the price per unit', () => {
    render(<Receipt sale={weighed} settings={settings} />);
    expect(screen.getByText(`1.250 kg × ${usd(3.99)}/kg`)).toBeInTheDocument();
  });

  it('shows the unit in the compact and A4 layouts', () => {
    const { rerender } = render(<Receipt sale={weighed} settings={{ ...settings, receiptTemplate: 'compact' }} />);
    expect(screen.getByText(/1\.250 kg Apples/)).toBeInTheDocument();
    rerender(<Receipt sale={weighed} settings={{ ...settings, receiptFormat: 'a4' }} />);
    expect(screen.getByRole('cell', { name: '1.250 kg' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: `${usd(3.99)}/kg` })).toBeInTheDocument();
  });

  it('leaves piece lines unchanged', () => {
    render(<Receipt sale={baseSale()} settings={settings} />);
    expect(screen.getByText(`2 × ${usd(15)}`)).toBeInTheDocument();
  });
});
