import { currentLang, t } from '@/i18n';
import apiClient from './client';

export interface UpdateOptions {
  // Version of the record the user edited: the server refuses the update (409
  // VERSION_CONFLICT) if someone else saved it since (optimistic concurrency)
  expectedVersion?: number | null;
}

/**
 * Standard list/get/create/update/remove calls for a tenant-scoped resource
 */
export function crudApi<T, Input = Partial<T>>(path: string) {
  return {
    list: async (params?: object): Promise<T[]> => {
      const { data } = await apiClient.get(path, { params });
      return data;
    },
    get: async (id: string): Promise<T> => {
      const { data } = await apiClient.get(`${path}/${id}`);
      return data;
    },
    create: async (input: Input): Promise<T> => {
      const { data } = await apiClient.post(path, input);
      return data;
    },
    update: async (id: string, input: Partial<Input>, options?: UpdateOptions): Promise<T> => {
      const version = options?.expectedVersion;
      const { data } = await apiClient.patch(`${path}/${id}`, input, {
        headers: typeof version === 'number' ? { 'If-Match': String(version) } : undefined,
      });
      return data;
    },
    remove: async (id: string): Promise<void> => {
      await apiClient.delete(`${path}/${id}`);
    },
  };
}

// Translatable names are stored as { en: '...' }
export type LocalizedText = Record<string, string>;
const SYSTEM_LOYALTY_NAME = 'Loyalty points';
// Localized value in the active language, else English, else any
export const text = (value: LocalizedText | null | undefined, fallback = '') =>
  value?.[currentLang()] ||
  // The "Loyalty points" tender is created by the system (in English), not by the store
  (value?.en === SYSTEM_LOYALTY_NAME ? t('Loyalty points') : '') ||
  value?.en ||
  Object.values(value ?? {})[0] ||
  fallback;
