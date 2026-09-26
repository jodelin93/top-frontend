import apiClient from './client';
import type { Paginated } from './sales';

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  approverId: string | null;
  approverName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  changes: { before?: unknown; after?: unknown } | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  requestId: string | null;
}

export const auditApi = {
  list: async (params: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AuditLogEntry>> => {
    const { data } = await apiClient.get('/audit-logs', { params });
    return data;
  },
};
