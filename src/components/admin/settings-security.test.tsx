import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSecurity } from './settings-security';

const api = vi.hoisted(() => ({ update: vi.fn() }));
// Same object on every render (the form resets when the settings change)
const settings = vi.hoisted(() => ({
  isLoading: false,
  data: {
    offlineLeaseHours: 24,
    offlineMaxSaleAmount: 0,
    offlineMaxSales: 500,
    offlineMaxTotal: 0,
    requireMfaForAdmins: false,
  },
}));

vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  settingsApi: api,
}));
vi.mock('@/hooks/use-store-settings', () => ({
  useStoreSettings: () => settings,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('SettingsSecurity offline limits', () => {
  beforeEach(() => api.update.mockReset().mockResolvedValue({}));

  it('shows the current limits and saves new ones as numbers', async () => {
    render(<SettingsSecurity />, { wrapper });
    expect(screen.getByLabelText('Offline sales per window')).toHaveValue('500');

    const perSale = screen.getByLabelText('Largest offline sale');
    await userEvent.clear(perSale);
    await userEvent.type(perSale, '250.50');
    const total = screen.getByLabelText('Offline sales total per window');
    await userEvent.clear(total);
    await userEvent.type(total, '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][0]).toMatchObject({
      offlineMaxSaleAmount: 250.5,
      offlineMaxSales: 500,
      offlineMaxTotal: 5000,
    });
  });

  it('refuses a limit that is not a number', async () => {
    render(<SettingsSecurity />, { wrapper });
    const count = screen.getByLabelText('Offline sales per window');
    await userEvent.clear(count);
    await userEvent.type(count, 'lots');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Whole number (0 = no limit)')).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });
});
