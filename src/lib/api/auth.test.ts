import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { authApi, signInErrorMessage } from './auth';
import { apiClient } from './client';

const errorWith = (status: number, data: unknown) =>
  new AxiosError('refused', 'ERR', undefined, null, { status, data } as AxiosResponse);

// Adapter answering like the real ones: validateStatus decides between resolve and reject
const answerWith = (status: number, data: unknown) => (config: InternalAxiosRequestConfig) => {
  const response = { status, statusText: '', data, headers: {}, config } as AxiosResponse;
  return config.validateStatus?.(status)
    ? Promise.resolve(response)
    : Promise.reject(new AxiosError('refused', 'ERR', config, null, response));
};

describe('signInErrorMessage', () => {
  it('shows the lockout message of the server', () => {
    const message = 'Too many failed attempts. This account is locked for a few minutes.';
    expect(signInErrorMessage(errorWith(429, { statusCode: 429, message }), 'Invalid credentials')).toBe(message);
  });

  it('replaces the technical rate-limit message', () => {
    expect(
      signInErrorMessage(errorWith(429, { message: 'ThrottlerException: Too Many Requests' }), 'Invalid credentials')
    ).toBe('Too many attempts. Wait a few minutes and try again.');
  });

  it('falls back like getErrorMessage for other errors', () => {
    expect(signInErrorMessage(errorWith(401, {}), 'Invalid credentials')).toBe('Invalid credentials');
  });
});

describe('authApi.changePassword', () => {
  const adapter = apiClient.defaults.adapter;
  afterEach(() => {
    apiClient.defaults.adapter = adapter;
    localStorage.clear();
  });

  it('rejects a wrong current password without ending the session', async () => {
    localStorage.setItem('access_token', 'token');
    apiClient.defaults.adapter = answerWith(401, { message: 'Your current password is incorrect' });
    const error = await authApi.changePassword({ currentPassword: 'wrong-one', newPassword: 'new-password' }).catch((e) => e);
    expect(error).toBeInstanceOf(AxiosError);
    expect(error.response.status).toBe(401);
    expect(signInErrorMessage(error, 'x')).toBe('Your current password is incorrect');
    // The session is kept (the API client clears it on an expired-session 401)
    expect(localStorage.getItem('access_token')).toBe('token');
  });

  it('resolves on 204', async () => {
    apiClient.defaults.adapter = answerWith(204, '');
    await expect(authApi.changePassword({ currentPassword: 'old-password', newPassword: 'new-password' })).resolves.toBeUndefined();
  });
});
