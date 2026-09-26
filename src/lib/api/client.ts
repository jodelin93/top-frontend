import { t } from '@/i18n';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { translateServerError } from '@/lib/server-texts';

// localStorage key of this browser's registered POS device id (see lib/pos/offline-db.ts)
export const DEVICE_ID_KEY = 'pos_device_id';
// Set when the server refused this till as lost (DEVICE_LOST): the till stays blocked
// (no sync, no sales) until a manager re-enrolls it
export const DEVICE_LOST_KEY = 'pos_device_lost';

const deviceLostListeners = new Set<() => void>();

/** "This till was marked lost" flag, shared by the API client and the POS screen. */
export const deviceLost = {
  get: (): boolean => {
    try {
      return !!localStorage.getItem(DEVICE_LOST_KEY);
    } catch {
      return false;
    }
  },
  /** Forget the device id (no more X-Device-Id) and raise the flag. */
  mark: () => {
    try {
      localStorage.setItem(DEVICE_LOST_KEY, new Date().toISOString());
      localStorage.removeItem(DEVICE_ID_KEY);
    } catch {
      // Storage unavailable: the flag lives until the page reloads
    }
    deviceLostListeners.forEach((listener) => listener());
  },
  /** A manager re-enrolls the till: it registers again as a new device. */
  clear: () => {
    try {
      localStorage.removeItem(DEVICE_LOST_KEY);
    } catch {
      // Nothing stored
    }
    deviceLostListeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    deviceLostListeners.add(listener);
    return () => {
      deviceLostListeners.delete(listener);
    };
  },
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Fall back to the short-lived MFA token while the second factor is pending
    const token = localStorage.getItem('access_token') || localStorage.getItem('temp_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Registered POS device (lets the server tie sessions to a till)
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (deviceId && config.headers) {
      config.headers['X-Device-Id'] = deviceId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Failed logins / MFA codes are shown on the form, not treated as an expired session
    // (POST /auth/password answers 401 for a wrong current password: not a sign-out)
    const isAuthAttempt = /\/auth\/(login|logout|mfa\/verify|password)$|\/tenants\/signup$/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && !isAuthAttempt) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('temp_token');
      localStorage.removeItem('auth-storage');
      // Outside React: a full reload also resets all in-memory state after session expiry
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/auth/login';
    }
    // Store policy: this role must set up two-factor authentication first
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    // An administrator marked this till lost: stop using its enrollment
    if (error.response?.status === 403 && code === 'DEVICE_LOST' && !deviceLost.get()) {
      deviceLost.mark();
    }
    if (
      error.response?.status === 403 &&
      code === 'MFA_SETUP_REQUIRED' &&
      !window.location.pathname.startsWith('/account/security')
    ) {
      // Outside React: a full navigation also drops state loaded with the old permissions
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/account/security?mfaRequired=1';
    }
    return Promise.reject(error);
  }
);

// Idempotent commands (expenses, shift movements / close, counts, transfers, settings):
// generate one key when the dialog / action opens and send the same key on every retry,
// so a double-click or a retried request never runs the command twice.
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export const newIdempotencyKey = (): string => crypto.randomUUID();

// Headers with the Idempotency-Key (when there is one) merged over `headers` (e.g. an approval token)
export function withIdempotencyKey(
  key: string | null | undefined,
  headers?: Record<string, string>
): Record<string, string> | undefined {
  if (!key) return headers;
  return { ...headers, [IDEMPOTENCY_KEY_HEADER]: key };
}

// Machine-readable code of an API error (e.g. VERSION_CONFLICT, INSUFFICIENT_STOCK)
export function getErrorCode(error: unknown): string | undefined {
  const code = (error as AxiosError<{ code?: unknown }>)?.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

// Someone else saved the record after it was loaded (optimistic concurrency)
export const isVersionConflict = (error: unknown) => getErrorCode(error) === 'VERSION_CONFLICT';

// Extract a readable message from an API error (NestJS returns a string or string[])
// Server messages are in English; known ones are translated (src/i18n/fr/errors.ts)
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isVersionConflict(error)) return t('This record was changed by someone else — reload');
  const message = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  // The server writes in English: translated here, variable parts kept
  if (Array.isArray(message)) return message.map((m) => translateServerError(m)).join(', ');
  return message ? translateServerError(message) : t(fallback);
}

export default apiClient;
