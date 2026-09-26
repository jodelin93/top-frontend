import apiClient from './client';

export type OutboxStatus = 'pending' | 'failed' | 'dead' | 'published';

export interface OutboxEventRow {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  schemaVersion: number;
  payload: Record<string, unknown>;
  correlationId: string | null;
  occurredAt: string;
  publishedAt: string | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string;
  deadLetteredAt: string | null;
  status: OutboxStatus;
  consumers?: { consumer: string; processedAt: string }[];
}

export interface CheckResult {
  key: string;
  label: string;
  passed: boolean;
  issueCount: number;
  issues: { reference: string; expected?: number | null; actual?: number | null; detail?: string | null }[];
}

export interface CheckRun {
  id: string;
  trigger: 'scheduled' | 'manual';
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'passed' | 'issues' | 'failed';
  results: CheckResult[];
  error: string | null;
}

export interface SystemEventsSummary {
  outbox: {
    pending: number;
    failed: number;
    deadLettered: number;
    publishedLastDay: number;
    oldestPendingAt: string | null;
    lastPublishedAt: string | null;
    lagMs: number;
    stalled: boolean;
  };
  lastRun: CheckRun | null;
  consumers: { eventType: string; consumers: string[] }[];
}

export const systemEventsApi = {
  summary: async (): Promise<SystemEventsSummary> => {
    const { data } = await apiClient.get('/system-events/summary');
    return data;
  },
  outbox: async (params: {
    status?: OutboxStatus | 'all';
    eventType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: OutboxEventRow[]; meta: { total: number; page: number; totalPages: number } }> => {
    const { data } = await apiClient.get('/system-events/outbox', { params });
    return data;
  },
  event: async (id: string): Promise<OutboxEventRow> => {
    const { data } = await apiClient.get(`/system-events/outbox/${id}`);
    return data;
  },
  retry: async (id: string): Promise<OutboxEventRow> => {
    const { data } = await apiClient.post(`/system-events/outbox/${id}/retry`);
    return data;
  },
  replay: async (id: string, consumer?: string): Promise<OutboxEventRow> => {
    const { data } = await apiClient.post(`/system-events/outbox/${id}/replay`, consumer ? { consumer } : {});
    return data;
  },
  checkRuns: async (limit = 20): Promise<CheckRun[]> => {
    const { data } = await apiClient.get('/system-events/checks', { params: { limit } });
    return data;
  },
  runChecks: async (): Promise<{ run: CheckRun }> => {
    const { data } = await apiClient.post('/system-events/checks/run');
    return data;
  },
};
