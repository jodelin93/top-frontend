import { AxiosError } from 'axios';
import apiClient, { getErrorMessage } from './client';
import { t } from '@/i18n';
import type { User } from '@/stores/auth-store';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  requiresMfa: boolean;
  // Signed in with a restricted token: the store requires two-factor for this role
  mfaSetupRequired?: boolean;
  // When the access token and its session expire
  expiresAt?: string;
  user?: User;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
}

export interface MfaVerifyRequest {
  token: string;
}

export interface StoreOption {
  tenantId: string;
  name: string;
  slug: string;
  role: string;
  roleName: string;
  current: boolean;
}

export const authApi = {
  // Login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  // Verify MFA token
  verifyMfa: async (token: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/mfa/verify', { token });
    return data;
  },

  // Enable MFA
  enableMfa: async (): Promise<MfaSetupResponse> => {
    const { data } = await apiClient.post('/auth/mfa/enable');
    return data;
  },

  // Confirm MFA setup; returns a fresh, unrestricted token for this session
  confirmMfa: async (token: string): Promise<{ success: boolean; session?: LoginResponse }> => {
    const { data } = await apiClient.post('/auth/mfa/confirm', { token });
    return data;
  },

  // Disable MFA
  disableMfa: async (token: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post('/auth/mfa/disable', { token });
    return data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.post('/auth/me');
    return data;
  },

  // Revoke the session behind `token` (sent explicitly: the local copy is cleared at once)
  logout: async (token: string): Promise<void> => {
    await apiClient.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } });
  },

  // Stores this account belongs to
  stores: async (): Promise<StoreOption[]> => {
    const { data } = await apiClient.get('/auth/stores');
    return data;
  },

  // Continue the session in another store (new token)
  switchStore: async (tenantId: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/switch-store', { tenantId });
    return data;
  },

  // Change one's own password (the current one is required); signs out every other session.
  // A wrong current password is a 401: handled here so the API client doesn't take it for an
  // expired session and sign the user out.
  changePassword: async (input: { currentPassword: string; newPassword: string }): Promise<void> => {
    const response = await apiClient.post('/auth/password', input, {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 401,
    });
    if (response.status === 401) {
      throw new AxiosError(
        'Request failed with status code 401',
        AxiosError.ERR_BAD_REQUEST,
        response.config,
        response.request,
        response
      );
    }
  },

  // Stores that added this account and wait for it to accept
  invitations: async (): Promise<StoreOption[]> => {
    const { data } = await apiClient.get('/auth/invitations');
    return data;
  },

  // Join the store (accept) or remove the invitation (decline)
  answerInvitation: async (tenantId: string, answer: 'accept' | 'decline'): Promise<void> => {
    await apiClient.post(`/auth/invitations/${tenantId}/${answer}`);
  },
};

// Error of a sign-in step (login, two-factor code, sign-up). A 429 is either the account
// lockout (its message says so) or the per-address rate limit (a technical message).
export function signInErrorMessage(error: unknown, fallback: string): string {
  const response = (error as AxiosError<{ message?: unknown }>)?.response;
  const message = response?.data?.message;
  if (response?.status === 429 && (typeof message !== 'string' || /^ThrottlerException/.test(message))) {
    return t('Too many attempts. Wait a few minutes and try again.');
  }
  return getErrorMessage(error, fallback);
}
