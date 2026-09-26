import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PaymentMethod } from '@/lib/api/settings';
import { formatMoney } from '@/lib/format';
import { PaymentDialog, type TenderedPayment } from './payment-dialog';

const method = (overrides: Partial<PaymentMethod> & Pick<PaymentMethod, 'id' | 'code' | 'methodType'>): PaymentMethod => ({
  name: { en: overrides.code },
  requiresReference: false,
  opensDrawer: false,
  status: 'active',
  ...overrides,
});

const cash = method({ id: 'pm-cash', code: 'Cash', methodType: 'cash', opensDrawer: true });
const card = method({ id: 'pm-card', code: 'Card', methodType: 'card' });

const usd = (value: number) => formatMoney(value, 'USD');

function setup(amountDue: number, exchangeRates: Record<string, number> = {}) {
  const onComplete = vi.fn<(payments: TenderedPayment[], changeCurrency?: string) => void>();
  render(
    <PaymentDialog
      open
      onOpenChange={vi.fn()}
      amountDue={amountDue}
      currency="USD"
      storeCurrency="USD"
      exchangeRates={exchangeRates}
      paymentMethods={[cash, card]}
      online
      submitting={false}
      error={null}
      onComplete={onComplete}
    />
  );
  return { user: userEvent.setup(), onComplete };
}

const completeButton = () => screen.getByRole('button', { name: /complete sale/i });
const stat = (label: string) => screen.getByText(label).nextElementSibling;

describe('PaymentDialog', () => {
  it('keeps "Complete sale" disabled until the sale is fully paid', async () => {
    const { user } = setup(50);
    expect(completeButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Card' }));
    const amount = screen.getByRole('textbox', { name: /^Amount/ });
    expect(amount).toHaveValue('50.00'); // prefilled with what's left
    await user.clear(amount);
    await user.type(amount, '49.99');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(stat('Remaining')).toHaveTextContent(usd(0.01));
    expect(completeButton()).toBeDisabled();
  });

  it('takes a split tender and completes with every payment', async () => {
    const { user, onComplete } = setup(50);

    await user.click(screen.getByRole('button', { name: 'Card' }));
    const amount = screen.getByRole('textbox', { name: /^Amount/ });
    await user.clear(amount);
    await user.type(amount, '20');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(stat('Received')).toHaveTextContent(usd(20));
    expect(stat('Remaining')).toHaveTextContent(usd(30));
    expect(completeButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cash' }));
    expect(screen.getByRole('textbox', { name: /^Amount/ })).toHaveValue('30.00');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(stat('Received')).toHaveTextContent(usd(50));
    expect(screen.getAllByRole('button', { name: 'Remove payment' })).toHaveLength(2);
    // Fully paid: no more tender buttons, and the sale can be completed
    expect(screen.queryByRole('button', { name: 'Cash' })).not.toBeInTheDocument();
    expect(completeButton()).toBeEnabled();

    await user.click(completeButton());
    expect(onComplete).toHaveBeenCalledWith([
      { paymentMethodId: 'pm-card', amount: 20, reference: undefined },
      { paymentMethodId: 'pm-cash', amount: 30, reference: undefined },
    ], undefined);
  });

  it('shows the change due when cash exceeds the total', async () => {
    const { user, onComplete } = setup(42.5);

    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: usd(50) })); // quick-cash suggestion

    expect(stat('Change')).toHaveTextContent(usd(7.5));
    expect(screen.queryByText('Remaining')).not.toBeInTheDocument();
    expect(completeButton()).toBeEnabled();
    expect(completeButton()).toHaveTextContent(`give ${usd(7.5)} change`);

    await user.click(completeButton());
    expect(onComplete).toHaveBeenCalledWith([{ paymentMethodId: 'pm-cash', amount: 50, reference: undefined }], undefined);
  });

  it('refuses a non-cash payment larger than the remaining amount', async () => {
    const { user } = setup(50);

    await user.click(screen.getByRole('button', { name: 'Card' }));
    const amount = screen.getByRole('textbox', { name: /^Amount/ });
    await user.clear(amount);
    await user.type(amount, '60');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText(`Card can't exceed the remaining ${usd(50)}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove payment' })).not.toBeInTheDocument();
    expect(stat('Received')).toHaveTextContent(usd(0));
    expect(completeButton()).toBeDisabled();
  });

  it('requires a reference for methods that need one', async () => {
    const onComplete = vi.fn();
    render(
      <PaymentDialog
        open
        onOpenChange={vi.fn()}
        amountDue={10}
        currency="USD"
        storeCurrency="USD"
        exchangeRates={{}}
        paymentMethods={[method({ id: 'pm-mobile', code: 'Mobile', methodType: 'mobile', requiresReference: true })]}
        online
        submitting={false}
        error={null}
        onComplete={onComplete}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Mobile' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Mobile needs a reference (e.g. approval code)')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Reference' }), 'AUTH42');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(completeButton());
    expect(onComplete).toHaveBeenCalledWith([{ paymentMethodId: 'pm-mobile', amount: 10, reference: 'AUTH42' }], undefined);
  });

  describe('paying in another currency', () => {

    it('shows the total in HTG and records HTG cash with its rate', async () => {
      const { user, onComplete } = setup(10, { HTG: 132.5 });
      expect(screen.getAllByText(/^≈ HTG.1,325\.00$/).length).toBeGreaterThan(0);

      await user.click(screen.getByRole('radio', { name: 'HTG' }));
      await user.click(screen.getByRole('button', { name: 'Cash' }));
      const amount = screen.getByRole('textbox', { name: 'Amount in HTG' });
      expect(amount).toHaveValue('1325.00');
      await user.clear(amount);
      await user.type(amount, '2000');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      // Change shown in both currencies: 5.09 USD or 675 HTG (2000 − 1325)
      expect(screen.getByRole('button', { name: /^USD/ })).toHaveTextContent(/\$5\.09/);
      expect(screen.getByRole('button', { name: /^HTG/ })).toHaveTextContent(/HTG.675\.00/);
      await user.click(screen.getByRole('button', { name: /^HTG/ }));
      await user.click(completeButton());
      expect(onComplete).toHaveBeenCalledWith(
        [expect.objectContaining({ paymentMethodId: 'pm-cash', currencyCode: 'HTG', tenderedAmount: 2000, exchangeRate: 132.5 })],
        'HTG'
      );
      expect(completeButton()).toHaveTextContent(/HTG.675\.00/);
    });

    it('takes part in HTG and the rest in USD', async () => {
      const { user, onComplete } = setup(10, { HTG: 132.5 });
      await user.click(screen.getByRole('radio', { name: 'HTG' }));
      await user.click(screen.getByRole('button', { name: 'Card' }));
      const amount = screen.getByRole('textbox', { name: 'Amount in HTG' });
      await user.clear(amount);
      await user.type(amount, '662.50');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      expect(stat('Remaining')).toHaveTextContent(usd(5));

      await user.click(screen.getByRole('radio', { name: 'USD' }));
      await user.click(screen.getByRole('button', { name: 'Cash' }));
      expect(screen.getByRole('textbox', { name: 'Amount in USD' })).toHaveValue('5.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await user.click(completeButton());
      expect(onComplete).toHaveBeenCalledWith(
        [expect.objectContaining({ currencyCode: 'HTG', amount: 5 }), { paymentMethodId: 'pm-cash', amount: 5, reference: undefined }],
        undefined
      );
    });

    it('offers no currency choice when only the store currency is accepted', () => {
      setup(10);
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
  });

  describe('on account and store credit', () => {
    const onAccount = method({ id: 'pm-acct', code: 'ON_ACCOUNT', methodType: 'other' as PaymentMethod['methodType'] });
    const storeCredit = method({ id: 'pm-sc', code: 'STORE_CREDIT', methodType: 'store_credit' as PaymentMethod['methodType'] });
    const exchange = method({ id: 'pm-x', code: 'EXCHANGE_CREDIT', methodType: 'other' as PaymentMethod['methodType'] });

    const render2 = (props: { customer?: { id: string; name: string } | null; storeCreditBalance?: number | null; online?: boolean }) => {
      const onComplete = vi.fn<(payments: TenderedPayment[], changeCurrency?: string) => void>();
      render(
        <PaymentDialog
          open
          onOpenChange={vi.fn()}
          amountDue={30}
          currency="USD"
          storeCurrency="USD"
          exchangeRates={{}}
          paymentMethods={[cash, onAccount, storeCredit, exchange]}
          online={props.online ?? true}
          submitting={false}
          error={null}
          onComplete={onComplete}
          customer={props.customer ?? null}
          storeCreditBalance={props.storeCreditBalance ?? null}
        />
      );
      return { user: userEvent.setup(), onComplete };
    };

    it('needs a customer (and a connection) to sell on account; never offers exchange credit', () => {
      render2({});
      expect(screen.getByRole('button', { name: /ON_ACCOUNT/ })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /EXCHANGE_CREDIT/ })).not.toBeInTheDocument();
      // No store credit balance: not offered
      expect(screen.queryByRole('button', { name: /STORE_CREDIT/ })).not.toBeInTheDocument();
    });

    it('charges the account for the rest of the sale', async () => {
      const { user, onComplete } = render2({ customer: { id: 'c1', name: 'Ann' } });
      await user.click(screen.getByRole('button', { name: /ON_ACCOUNT/ }));
      expect(screen.getByRole('textbox', { name: /^Amount/ })).toHaveValue('30.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await user.click(completeButton());
      expect(onComplete).toHaveBeenCalledWith([{ paymentMethodId: 'pm-acct', amount: 30, reference: undefined }], undefined);
    });

    it('uses store credit up to the balance', async () => {
      const { user } = render2({ customer: { id: 'c1', name: 'Ann' }, storeCreditBalance: 12.5 });
      await user.click(screen.getByRole('button', { name: /STORE_CREDIT/ }));
      expect(screen.getByRole('textbox', { name: /^Amount/ })).toHaveValue('12.50');
      await user.clear(screen.getByRole('textbox', { name: /^Amount/ }));
      await user.type(screen.getByRole('textbox', { name: /^Amount/ }), '20');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      expect(screen.getByText(/store credit/i)).toBeInTheDocument();
      expect(stat('Remaining')).toHaveTextContent(usd(30));
    });

    it('disables them offline', () => {
      render2({ customer: { id: 'c1', name: 'Ann' }, storeCreditBalance: 10, online: false });
      expect(screen.getByRole('button', { name: /ON_ACCOUNT/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /STORE_CREDIT/ })).toBeDisabled();
    });
  });
});


describe('PaymentDialog between sales', () => {
  const props = (open: boolean, onComplete = vi.fn()) => ({
    open,
    onOpenChange: vi.fn(),
    amountDue: 10,
    currency: 'USD',
    storeCurrency: 'USD',
    exchangeRates: { HTG: 132.5 },
    paymentMethods: [cash, card],
    online: true,
    submitting: false,
    error: null,
    onComplete,
  });

  it('opens fresh for the next sale after the page closed it (sale completed)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PaymentDialog {...props(true)} />);
    await user.click(screen.getByRole('radio', { name: 'HTG' }));
    await user.click(screen.getByRole('button', { name: 'Cash' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getAllByRole('button', { name: 'Remove payment' })).toHaveLength(1);

    // The page closes the dialog itself once the sale is recorded, then opens it for the next one
    rerender(<PaymentDialog {...props(false)} />);
    rerender(<PaymentDialog {...props(true)} />);

    expect(screen.queryByRole('button', { name: 'Remove payment' })).not.toBeInTheDocument();
    expect(stat('Received')).toHaveTextContent(usd(0));
    expect(screen.getByRole('radio', { name: 'USD' })).toBeChecked();
    expect(completeButton()).toBeDisabled();
  });

  it('keeps the payments while it stays open for the same sale (e.g. approval cancelled)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PaymentDialog {...props(true)} />);
    await user.click(screen.getByRole('button', { name: 'Card' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    rerender(<PaymentDialog {...props(true)} error="Approval cancelled" />);

    expect(screen.getAllByRole('button', { name: 'Remove payment' })).toHaveLength(1);
    expect(completeButton()).toBeEnabled();
  });
});
