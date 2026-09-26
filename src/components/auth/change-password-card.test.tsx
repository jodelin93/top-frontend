import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordCard } from './change-password-card';

const api = vi.hoisted(() => ({ changePassword: vi.fn() }));
vi.mock('@/lib/api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth')>()),
  authApi: api,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

async function fill(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText('Current password'), current);
  await userEvent.type(screen.getByLabelText('New password'), next);
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

describe('ChangePasswordCard', () => {
  beforeEach(() => {
    api.changePassword.mockReset().mockResolvedValue(undefined);
  });

  it('changes the password and confirms it', async () => {
    render(<ChangePasswordCard />, { wrapper });
    await fill('old-password', 'new-password', 'new-password');
    await waitFor(() =>
      expect(api.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password', newPassword: 'new-password' })
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Your password was changed');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('refuses a confirmation that does not match, or a short password', async () => {
    render(<ChangePasswordCard />, { wrapper });
    await fill('old-password', 'short', 'other');
    expect(await screen.findByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('shows the server error', async () => {
    const refused = new AxiosError('refused', 'ERR', undefined, null, {
      status: 401,
      data: { message: 'Your current password is incorrect' },
    } as AxiosResponse);
    api.changePassword.mockRejectedValue(refused);
    render(<ChangePasswordCard />, { wrapper });
    await fill('wrong-password', 'new-password', 'new-password');
    expect(await screen.findByText('Your current password is incorrect')).toBeInTheDocument();
  });
});
