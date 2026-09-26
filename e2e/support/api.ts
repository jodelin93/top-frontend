/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal client for the backend REST API, used to set up data and to check what the
 * UI did. Retries while the backend is unreachable (it restarts in watch mode).
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    method: string,
    path: string,
  ) {
    super(`${method} ${path} -> ${status}: ${JSON.stringify(body)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Api {
  constructor(public token: string | null = null) {}

  async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const deadline = Date.now() + 90_000;
    for (;;) {
      let response: Response;
      try {
        response = await fetch(`${API_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        // Connection refused / reset while the backend restarts: wait and retry
        if (Date.now() < deadline) {
          await sleep(2_000);
          continue;
        }
        throw error;
      }
      const text = await response.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        // not JSON
      }
      // 502/503: a proxy or the app is still starting
      if ((response.status === 502 || response.status === 503) && Date.now() < deadline) {
        await sleep(2_000);
        continue;
      }
      if (!response.ok) throw new ApiError(response.status, parsed, method, path);
      return parsed as T;
    }
  }

  get<T = any>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T = any>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body ?? {});
  }
  patch<T = any>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body ?? {});
  }
  put<T = any>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body ?? {});
  }

  static async login(email: string, password: string) {
    const api = new Api();
    const result = await api.post<{ accessToken: string }>('/auth/login', { email, password });
    api.token = result.accessToken;
    return api;
  }
}
