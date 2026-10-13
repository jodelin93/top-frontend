import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRateCard } from './exchange-rate-card';

const store = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, update: vi.fn() }));

vi.mock('@/hooks/use-store-settings', () => ({ useStoreSettings: () => ({ data: store.settings }) }));
vi.mock('@/lib/api/settings', () => ({ settingsApi: { versions: vi.fn().mockResolvedValue([]), update: store.update } }));
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: object }) => unknown) => select({ user: {} }),
  hasPermission: () => true,
}));

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExchangeRateCard />
    </QueryClientProvider>
  );

// What the server keeps for a rate typed as gourdes per dollar in a gourde store
const perGourde = (gourdes: number) => Number((1 / gourdes).toPrecision(12));

describe('ExchangeRateCard', () => {
  beforeEach(() => {
    store.update.mockReset().mockImplementation(async (input) => ({ ...store.settings, ...input }));
  });

  it('writes a dollar store as 1 USD = … HTG and saves the rates as typed', async () => {
    store.settings = { currencyCode: 'USD', exchangeRates: { HTG: 134 }, exchangeBuyRates: { HTG: 131 } };
    show();
    expect(screen.getByTestId('rate-sell')).toHaveTextContent('1 USD = 134 HTG');
    expect(screen.getByTestId('rate-sell')).toHaveTextContent('HTG received → USD');
    expect(screen.getByTestId('rate-buy')).toHaveTextContent('1 USD = 131 HTG');

    fireEvent.click(screen.getByRole('button', { name: 'Update rate' }));
    expect(screen.getByTestId('rate-row')).toHaveTextContent('1 USD =');
    fireEvent.change(screen.getByLabelText('Sell rate for HTG'), { target: { value: '135' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rates' }));
    await waitFor(() => expect(store.update).toHaveBeenCalled());
    expect(store.update.mock.calls[0][0]).toMatchObject({ exchangeRates: { HTG: 135 }, exchangeBuyRates: { HTG: 131 } });
  });

  it('writes a gourde store as … HTG = 1 USD, with the sell rate for gourdes turned into dollars', async () => {
    // Dollars coming in are valued 130 HTG (buy); dollars given out cost 135 HTG (sell)
    store.settings = { currencyCode: 'HTG', exchangeRates: { USD: perGourde(130) }, exchangeBuyRates: { USD: perGourde(135) } };
    show();
    expect(screen.getByTestId('rate-sell')).toHaveTextContent('135 HTG = 1 USD');
    expect(screen.getByTestId('rate-sell')).toHaveTextContent('HTG → USD given out');
    expect(screen.getByTestId('rate-buy')).toHaveTextContent('130 HTG = 1 USD');
    expect(screen.getByTestId('rate-buy')).toHaveTextContent('USD received → HTG');

    fireEvent.click(screen.getByRole('button', { name: 'Update rate' }));
    expect(screen.getByTestId('rate-row')).toHaveTextContent('HTG = 1');
    expect(screen.getByLabelText('Sell rate for USD')).toHaveValue('135');
    expect(screen.getByLabelText('Buy rate for USD')).toHaveValue('130');
    fireEvent.change(screen.getByLabelText('Sell rate for USD'), { target: { value: '136.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rates' }));
    await waitFor(() => expect(store.update).toHaveBeenCalled());
    const sent = store.update.mock.calls[0][0];
    // Kept as dollars per gourde: coming in at the buy rate, given out at the sell rate
    expect(sent.exchangeRates.USD).toBeCloseTo(1 / 130, 12);
    expect(sent.exchangeBuyRates.USD).toBeCloseTo(1 / 136.5, 12);
  });

  it('starts a gourde store with gourdes per dollar', async () => {
    store.settings = { currencyCode: 'HTG', exchangeRates: {}, exchangeBuyRates: {} };
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Add a currency' }));
    expect(screen.getByTestId('rate-row')).toHaveTextContent('HTG = 1');
    fireEvent.change(screen.getByLabelText('Sell rate for USD'), { target: { value: '132.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rates' }));
    await waitFor(() => expect(store.update).toHaveBeenCalled());
    const sent = store.update.mock.calls[0][0];
    expect(sent.exchangeRates.USD).toBeCloseTo(1 / 132.5, 12);
    expect(sent.exchangeBuyRates.USD).toBeCloseTo(1 / 132.5, 12);
  });
});
