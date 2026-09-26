import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient, { getErrorCode, getErrorMessage, isVersionConflict } from './client';
import { crudApi } from './crud';
import { useI18nStore } from '@/i18n';

const conflict = {
  response: {
    status: 409,
    data: {
      statusCode: 409,
      message: 'This record was changed by someone else. Reload it and try again.',
      code: 'VERSION_CONFLICT',
      currentVersion: 4,
    },
  },
};

describe('optimistic concurrency', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useI18nStore.setState({ personal: null, storeDefault: null, initial: 'en' });
  });

  it('sends If-Match with the edited version', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: 'b1', version: 4 } });
    const api = crudApi<{ id: string; name: string; version?: number }>('/branches');

    await api.update('b1', { name: 'Main' }, { expectedVersion: 3 });
    expect(patch).toHaveBeenCalledWith('/branches/b1', { name: 'Main' }, { headers: { 'If-Match': '3' } });

    await api.update('b1', { name: 'Main' });
    expect(patch).toHaveBeenLastCalledWith('/branches/b1', { name: 'Main' }, { headers: undefined });
  });

  it('explains a version conflict (in the user language)', () => {
    expect(isVersionConflict(conflict)).toBe(true);
    expect(getErrorCode(conflict)).toBe('VERSION_CONFLICT');
    expect(getErrorMessage(conflict)).toBe('This record was changed by someone else — reload');
    useI18nStore.setState({ personal: 'fr' });
    expect(getErrorMessage(conflict)).toBe('Cet enregistrement a été modifié par quelqu’un d’autre — rechargez');
  });

  it('keeps the server message for other errors', () => {
    const other = { response: { data: { message: 'Branch not found', code: 'NOT_FOUND' } } };
    expect(isVersionConflict(other)).toBe(false);
    expect(getErrorMessage(other)).toBe('Branch not found');
    expect(getErrorCode(new Error('x'))).toBeUndefined();
  });
});
