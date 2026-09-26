import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, DEVICE_ID_KEY, DEVICE_LOST_KEY, deviceLost } from './client';

// Adapter answering every request with the given error response
const refuseWith = (status: number, data: unknown) => (config: InternalAxiosRequestConfig) => {
  const response = { status, statusText: 'Error', data, headers: {}, config } as AxiosResponse;
  return Promise.reject(new AxiosError('refused', 'ERR', config, null, response));
};

describe('API client: lost till (DEVICE_LOST)', () => {
  afterEach(() => {
    localStorage.clear();
    deviceLost.clear();
  });

  it('forgets the device id and raises the lost flag', async () => {
    localStorage.setItem(DEVICE_ID_KEY, 'd1');
    const listener = vi.fn();
    const unsubscribe = deviceLost.subscribe(listener);
    await expect(
      apiClient.post('/sync/push', {}, { adapter: refuseWith(403, { code: 'DEVICE_LOST', message: 'lost' }) })
    ).rejects.toBeInstanceOf(AxiosError);
    unsubscribe();

    expect(localStorage.getItem(DEVICE_ID_KEY)).toBeNull();
    expect(localStorage.getItem(DEVICE_LOST_KEY)).not.toBeNull();
    expect(deviceLost.get()).toBe(true);
    expect(listener).toHaveBeenCalled();
  });

  it('ignores other refusals', async () => {
    localStorage.setItem(DEVICE_ID_KEY, 'd1');
    await expect(
      apiClient.post('/sync/push', {}, { adapter: refuseWith(403, { code: 'DEVICE_REVOKED' }) })
    ).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe('d1');
    expect(deviceLost.get()).toBe(false);
  });

  it('sends no device id header once cleared', async () => {
    deviceLost.mark();
    let headers: AxiosHeaders | undefined;
    await apiClient.get('/pos/context', {
      adapter: (config) => {
        headers = config.headers;
        return Promise.resolve({ status: 200, statusText: 'OK', data: {}, headers: {}, config });
      },
    });
    expect(headers?.['X-Device-Id']).toBeUndefined();
  });
});
