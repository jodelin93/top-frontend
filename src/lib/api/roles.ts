import apiClient from './client';

export interface PermissionInfo {
  key: string;
  group: string;
  label: string;
}

export interface TenantRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

export const rolesApi = {
  list: async (): Promise<TenantRole[]> => {
    const { data } = await apiClient.get('/roles');
    return data;
  },
  permissions: async (): Promise<PermissionInfo[]> => {
    const { data } = await apiClient.get('/roles/permissions');
    return data;
  },
  create: async (input: { key: string; name: string; description?: string; permissions: string[] }): Promise<TenantRole> => {
    const { data } = await apiClient.post('/roles', input);
    return data;
  },
  update: async (id: string, input: { name?: string; description?: string | null; permissions?: string[] }): Promise<TenantRole> => {
    const { data } = await apiClient.patch(`/roles/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
};
