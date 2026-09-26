import apiClient from './client';
import type { LoginResponse } from './auth';

export interface SignupInput {
  storeName: string;
  slug?: string;
  email: string;
  password: string;
  // For an existing account with two-factor on: a current code
  mfaCode?: string;
  firstName?: string;
  lastName?: string;
  currencyCode?: string;
}

export interface SignupResponse extends LoginResponse {
  tenant: { id: string; name: string; slug: string };
}

export const tenantsApi = {
  // Whether self-service store sign-up is enabled on this server
  signupEnabled: async (): Promise<boolean> => {
    const { data } = await apiClient.get<{ enabled: boolean }>('/tenants/signup-enabled');
    return data.enabled;
  },
  signup: async (input: SignupInput): Promise<SignupResponse> => {
    const { data } = await apiClient.post('/tenants/signup', input);
    return data;
  },
};
