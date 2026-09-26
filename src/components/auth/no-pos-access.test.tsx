import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type User } from '@/stores/auth-store';
import { NoPosAccess } from './no-pos-access';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const signIn = (permissions: string[]) =>
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      id: 'u1',
      email: 'u@test.com',
      firstName: null,
      lastName: null,
      role: 'custom',
      permissions,
      tenantId: 't1',
      mfaEnabled: false,
    } satisfies User,
  });

describe('NoPosAccess (till screen for users who do not sell)', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
  });

  it('sends an accountant on to the admin area, with a link as well', () => {
    signIn(['reports.view', 'expenses.approve', 'payments.reconcile']);
    render(<NoPosAccess />);
    expect(router.replace).toHaveBeenCalledWith('/admin/dashboard');
    expect(screen.getByRole('link', { name: 'Go to administration' })).toHaveAttribute('href', '/admin/dashboard');
  });

  it('explains and offers sign-out to a user with no till or admin access', async () => {
    signIn(['customers.view']);
    render(<NoPosAccess />);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Go to administration' })).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('no access to the till or the administration');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(router.push).toHaveBeenCalledWith('/auth/login');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
