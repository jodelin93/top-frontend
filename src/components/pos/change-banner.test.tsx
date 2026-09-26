import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Sale } from '@/lib/api/sales';
import { ChangeBanner } from './change-banner';

const cash = { id: 'm', code: 'CASH', name: { en: 'Cash' }, methodType: 'cash', requiresReference: false, opensDrawer: true, status: 'active' } as const;
const sale = (overrides: Partial<Sale>): Sale =>
  ({ id: 's', saleNumber: 'S-1', total: 10, changeAmount: 0, currencyCode: 'USD', payments: [], ...overrides }) as Sale;

describe('ChangeBanner', () => {
  it('shows what was received in HTG and the change to give back in HTG', () => {
    render(
      <ChangeBanner
        sale={sale({
          changeAmount: 5.09,
          payments: [{ id: 'p', paymentMethodId: 'm', amount: 15.09, reference: null, status: 'completed', paymentMethod: cash, tenderedCurrency: 'HTG', tenderedAmount: '2000.0000', exchangeRate: '132.5' }],
          metadata: { changeTender: { currencyCode: 'HTG', amount: 675, exchangeRate: 132.5 } },
        })}
      />
    );
    expect(screen.getByText('Received · Cash').nextElementSibling).toHaveTextContent(/HTG.2,000\.00/);
    expect(screen.getByTestId('change-due')).toHaveTextContent(/HTG.675\.00/);
  });

  it('shows change in dollars when given in dollars', () => {
    render(
      <ChangeBanner
        sale={sale({ changeAmount: 10, payments: [{ id: 'p', paymentMethodId: 'm', amount: 20, reference: null, status: 'completed', paymentMethod: cash }] })}
      />
    );
    expect(screen.getByTestId('change-due')).toHaveTextContent('$10.00');
  });

  it('says when there is no change to give', () => {
    render(<ChangeBanner sale={sale({ payments: [] })} />);
    expect(screen.getByText(/no change to give/)).toBeInTheDocument();
  });
});
