import apiClient from './client';
import { t } from '@/i18n';

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  deviceId: string | null;
  authMethod: 'password' | 'mfa' | 'signup' | string;
  tenantId: string | null;
  current: boolean;
}

export const sessionsApi = {
  // My signed-in sessions
  list: async (): Promise<SessionInfo[]> => {
    const { data } = await apiClient.get('/sessions');
    return data;
  },
  revoke: async (id: string): Promise<void> => {
    await apiClient.delete(`/sessions/${id}`);
  },
  // Sign out every other session
  revokeOthers: async (): Promise<{ revoked: number }> => {
    const { data } = await apiClient.post('/sessions/revoke-others');
    return data;
  },
  // Admin (users.manage): a member's sessions in this store
  listForMember: async (userId: string): Promise<SessionInfo[]> => {
    const { data } = await apiClient.get(`/sessions/members/${userId}`);
    return data;
  },
  revokeMember: async (userId: string): Promise<{ revoked: number }> => {
    const { data } = await apiClient.post(`/sessions/members/${userId}/revoke`);
    return data;
  },
};

// "Chrome on macOS" from a user agent string
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return t('Unknown device');
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : /curl|node|axios/i.test(userAgent)
            ? t('API client')
            : t('Browser');
  const os = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  return os ? t('{browser} on {os}', { browser, os }) : browser;
}
