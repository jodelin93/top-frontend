import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsWarehouses } from './settings-warehouses';

const locations = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/api/inventory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/inventory')>()),
  stockLocationsApi: locations,
}));
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  warehousesApi: {
    list: () =>
      Promise.resolve([
        { id: 'w1', code: 'MAIN', name: 'Main', warehouseType: 'standard', status: 'active' },
        { id: 'w2', code: 'TRANSIT', name: 'In transit', warehouseType: 'transit', status: 'active' },
      ]),
  },
}));

const renderSettings = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<SettingsWarehouses />, { wrapper });
};

describe('Stock locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locations.list.mockResolvedValue([
      { id: 'l1', warehouseId: 'w1', code: 'FLOOR', name: 'Floor', locationType: 'zone', isSellable: true, stockStatus: 'sellable' },
      { id: 'l2', warehouseId: 'w1', code: 'QA', name: 'Returns', locationType: 'zone', isSellable: false, stockStatus: 'quarantine' },
      { id: 'lt', warehouseId: 'w2', code: 'TRANSIT-1', name: 'Transit', locationType: 'zone', isSellable: false, stockStatus: 'transit' },
    ]);
  });

  it('shows each stock status and keeps the transit location read-only', async () => {
    renderSettings();
    const quarantine = (await screen.findByText('Returns')).closest('tr')!;
    expect(within(quarantine).getByText('Quarantine')).toBeInTheDocument();
    const transit = screen.getByText('TRANSIT-1').closest('tr')!;
    expect(within(transit).getByText('System')).toBeInTheDocument();
    expect(within(transit).queryAllByRole('button')).toHaveLength(0);
  });

  it('sets the stock status with a select instead of a sellable checkbox', async () => {
    locations.update.mockResolvedValue({});
    const user = userEvent.setup();
    renderSettings();
    const floor = (await screen.findByText('Floor')).closest('tr')!;
    await user.click(within(floor).getAllByRole('button')[0]);

    const select = await screen.findByRole('combobox', { name: 'Stock status' });
    expect(select).toHaveValue('sellable');
    expect(within(select).queryByRole('option', { name: 'In transit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Sellable/ })).not.toBeInTheDocument();
    await user.selectOptions(select, 'damaged');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(locations.update).toHaveBeenCalledWith('l1', expect.objectContaining({ stockStatus: 'damaged' }))
    );
    expect(locations.update.mock.calls[0][1]).not.toHaveProperty('isSellable');
  });
});
