import apiClient from './client';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  occurrences: number;
  lastOccurredAt: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  data: AppNotification[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  mutedTypes: string[];
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
}

export interface NotificationTypeInfo {
  type: string;
  label: string;
  severity: NotificationSeverity;
}

export const notificationsApi = {
  list: async (params: { unreadOnly?: boolean; type?: string; page?: number; limit?: number }): Promise<NotificationList> => {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },
  unreadCount: async (): Promise<{ unread: number; critical: number }> => {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data;
  },
  markRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<{ updated: number }> => {
    const { data } = await apiClient.post('/notifications/read-all');
    return data;
  },
  preferences: async (): Promise<
    NotificationPreferences & { emailAvailable: boolean; types: NotificationTypeInfo[] }
  > => {
    const { data } = await apiClient.get('/notifications/preferences');
    return data;
  },
  updatePreferences: async (input: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const { data } = await apiClient.put('/notifications/preferences', input);
    return data;
  },
};
