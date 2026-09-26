import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingInvitations } from './pending-invitations';

const api = vi.hoisted(() => ({ invitations: vi.fn(), answerInvitation: vi.fn() }));
vi.mock('@/lib/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth')>()),
  authApi: api,
}));

const invitation = { tenantId: 't2', name: 'Corner Shop', slug: 'corner', role: 'cashier', roleName: 'Cashier', current: false };

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<PendingInvitations />, { wrapper });
  return { invalidate };
}

describe('PendingInvitations', () => {
  beforeEach(() => {
    api.invitations.mockReset().mockResolvedValue([invitation]);
    api.answerInvitation.mockReset().mockResolvedValue(undefined);
  });

  it('accepts an invitation and refreshes the store list', async () => {
    const { invalidate } = renderWithClient();
    expect(await screen.findByText('Corner Shop')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept the invitation from Corner Shop' }));
    await waitFor(() => expect(api.answerInvitation).toHaveBeenCalledWith('t2', 'accept'));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auth', 'stores'] }));
  });

  it('declines an invitation', async () => {
    renderWithClient();
    await userEvent.click(await screen.findByRole('button', { name: 'Decline the invitation from Corner Shop' }));
    await waitFor(() => expect(api.answerInvitation).toHaveBeenCalledWith('t2', 'decline'));
  });

  it('shows nothing without invitations', async () => {
    api.invitations.mockResolvedValue([]);
    renderWithClient();
    await waitFor(() => expect(api.invitations).toHaveBeenCalled());
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
