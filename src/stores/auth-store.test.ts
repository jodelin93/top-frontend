import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api/client';
import { removeLegacyTokens, retryPendingLogout, useAuthStore } from './auth-store';

vi.mock('@/lib/session-cleanup', () => ({ clearLocalSessionData: vi.fn(async () => undefined) }));

const user = {
  id: 'u1',
  email: 'owner@example.com',
  firstName: 'O',
  lastName: 'W',
  role: 'owner',
  tenantId: 't1',
  mfaEnabled: false,
};

describe('auth store (HttpOnly cookie session)', () => {
  const adapter = apiClient.defaults.adapter;
  const requests: InternalAxiosRequestConfig[] = [];

  const answer = (status: number | 'network') => {
    apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      requests.push(config);
      if (status === 'network') return Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
      const response = { status, statusText: '', data: {}, headers: {}, config } as AxiosResponse;
      return status < 300
        ? Promise.resolve(response)
        : Promise.reject(new AxiosError('refused', 'ERR', config, null, response));
    };
  };

  beforeEach(() => {
    requests.length = 0;
    localStorage.clear();
  });
  afterEach(() => {
    apiClient.defaults.adapter = adapter;
  });

  it('never keeps a token: only the profile is saved', () => {
    useAuthStore.getState().setUser(user);
    const saved = localStorage.getItem('auth-storage') ?? '';
    expect(saved).toContain('owner@example.com');
    expect(saved).not.toMatch(/token/i);
    expect(Object.keys(useAuthStore.getState())).not.toContain('accessToken');
  });

  it('removes tokens saved by earlier versions', () => {
    localStorage.setItem('access_token', 'old');
    localStorage.setItem('temp_token', 'old');
    removeLegacyTokens();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('temp_token')).toBeNull();
  });

  it('sends cookies and the anti-CSRF header, never an Authorization header', async () => {
    answer(200);
    localStorage.setItem('access_token', 'old');
    await apiClient.post('/sales', {});
    const config = requests[0];
    expect(config.withCredentials).toBe(true);
    expect(config.headers['X-Requested-With']).toBe('pos-web');
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('signs out on the server (cookie cleared there) and locally', async () => {
    answer(200);
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    await vi.waitFor(() => expect(requests.map((r) => r.url)).toContain('/auth/logout'));
    expect(localStorage.getItem('pos_logout_pending')).toBeNull();
  });

  it('retries a sign-out made offline once back online', async () => {
    answer('network');
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().logout();
    await vi.waitFor(() => expect(localStorage.getItem('pos_logout_pending')).toBe('1'));

    answer(200);
    retryPendingLogout();
    await vi.waitFor(() => expect(localStorage.getItem('pos_logout_pending')).toBeNull());
    expect(requests.filter((r) => r.url === '/auth/logout')).toHaveLength(2);
  });

  it('does not sign out someone who signed in since', () => {
    answer(200);
    localStorage.setItem('pos_logout_pending', '1');
    useAuthStore.getState().setUser(user);
    retryPendingLogout();
    expect(requests).toHaveLength(0);
    expect(localStorage.getItem('pos_logout_pending')).toBeNull();
  });
});
