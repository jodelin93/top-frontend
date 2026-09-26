import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { ProductFormDialog } from './product-form-dialog';

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn() }));

vi.mock('@/lib/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/products')>();
  return {
    ...actual,
    productsApi: { ...actual.productsApi, ...api },
    unitsApi: {
      list: () =>
        Promise.resolve([
          { id: 'u1', code: 'kg', name: 'Kilogram', allowsDecimals: true, precision: 3, isActive: true, createdAt: '' },
        ]),
    },
  };
});
vi.mock('@/lib/api/categories', () => ({ categoriesApi: { list: () => Promise.resolve([]) } }));
vi.mock('@/lib/api/tax-categories', () => ({ taxCategoriesApi: { list: () => Promise.resolve([]) } }));
vi.mock('@/lib/api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/settings')>()),
  branchesApi: {
    list: () =>
      Promise.resolve([
        { id: 'b1', name: 'Downtown', status: 'active' },
        { id: 'b2', name: 'Airport', status: 'active' },
      ]),
  },
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ProductFormDialog open onOpenChange={() => {}} product={null} onSaved={() => {}} />, { wrapper });
}

describe('ProductFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'u@test',
        firstName: null,
        lastName: null,
        role: 'manager',
        permissions: ['catalog.manage', 'inventory.cost.view'],
        tenantId: 't',
        mfaEnabled: false,
      },
    });
  });

  it('has no backorder option and sends tags, unit, branches and a normalized barcode', async () => {
    api.create.mockResolvedValue({ id: 'p1', productType: 'simple' });
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByText(/backorder/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Rice');
    await user.type(screen.getByLabelText('SKU'), 'RICE-1');

    // Wrong check digit: a warning, the barcode is still saved
    await user.type(screen.getByLabelText('Barcode'), '501 2345 678901');
    expect(await screen.findByText(/check digit of this EAN-13 barcode is wrong/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Tags'), ' Summer  SALE,rice{Enter}');
    expect(screen.getByText('summer sale')).toBeInTheDocument();
    expect(screen.getByText('rice')).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Kilogram (kg)' });
    await user.selectOptions(screen.getByLabelText('Unit of measure'), 'u1');
    expect(screen.getByText(/Sold at every branch/)).toBeInTheDocument();
    await user.click(await screen.findByRole('checkbox', { name: 'Airport' }));

    await user.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => expect(api.create).toHaveBeenCalled());
    const input = api.create.mock.calls[0][0];
    expect(input).toMatchObject({
      barcode: '5012345678901',
      tags: ['summer sale', 'rice'],
      unitId: 'u1',
      branchIds: ['b2'],
    });
    expect(input).not.toHaveProperty('allowBackorder');
  });
});
