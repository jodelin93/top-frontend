import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from './page';

const api = vi.hoisted(() => ({ signupEnabled: vi.fn(), signup: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/tenants', () => ({ tenantsApi: api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const mfaRequired = new AxiosError('refused', 'ERR', undefined, null, {
  status: 401,
  data: {
    code: 'MFA_REQUIRED',
    message: 'This account uses two-factor authentication. Enter a current code from your authenticator app.',
  },
} as AxiosResponse);

describe('SignupPage with an existing two-factor account', () => {
  beforeEach(() => {
    api.signupEnabled.mockReset().mockResolvedValue(true);
    api.signup.mockReset();
    push.mockReset();
  });

  it('asks for a code and sends it with the sign-up', async () => {
    api.signup
      .mockRejectedValueOnce(mfaRequired)
      .mockResolvedValueOnce({ accessToken: 'token', requiresMfa: false, tenant: { id: 't', name: 'Shop', slug: 'shop' } });
    render(<SignupPage />, { wrapper });

    await userEvent.type(await screen.findByLabelText('Store name'), 'My Shop');
    await userEvent.type(screen.getByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'current-password');
    expect(screen.queryByLabelText('Two-factor code')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create store' }));

    expect(await screen.findByText(/uses two-factor authentication. Enter a current code/)).toBeInTheDocument();
    expect(api.signup.mock.calls[0][0].mfaCode).toBeUndefined();

    await userEvent.type(screen.getByLabelText('Two-factor code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Create store' }));
    await waitFor(() => expect(api.signup).toHaveBeenCalledTimes(2));
    expect(api.signup.mock.calls[1][0]).toMatchObject({ email: 'owner@example.com', mfaCode: '123456' });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/settings'));
  });
});
