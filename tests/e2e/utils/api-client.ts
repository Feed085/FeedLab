import { config } from '../config.ts';

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
  raw: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class ApiClient {
  public baseUrl: string;
  private token: string | null = null;
  private defaultTimeoutMs: number;

  constructor(baseUrl?: string, defaultTimeoutMs?: number) {
    this.baseUrl = (baseUrl || config.apiUrl).replace(/\/+$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs ?? config.timeoutMs;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  async request<T = any>(
    method: string,
    path: string,
    options: {
      body?: any;
      formData?: FormData;
      headers?: Record<string, string>;
      timeoutMs?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const url = this.resolveUrl(path);
    const headers = new Headers();

    if (this.token && !options.headers?.Authorization && !options.headers?.authorization) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    let requestBody: any = undefined;

    if (options.formData) {
      requestBody = options.formData;
      // Native fetch automatically sets multipart/form-data boundary when body is FormData
    } else if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === 'string') {
        requestBody = options.body;
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'text/plain; charset=utf-8');
        }
      } else {
        requestBody = JSON.stringify(options.body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json; charset=utf-8');
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs ?? this.defaultTimeoutMs);

    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      const raw = await response.text();
      let data: any = raw;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      } else {
        data = null;
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
        raw,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${method} ${url} timed out after ${options.timeoutMs ?? this.defaultTimeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T = any>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, { headers });
  }

  async post<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body, headers });
  }

  async put<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body, headers });
  }

  async patch<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { body, headers });
  }

  async delete<T = any>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, { headers });
  }

  async upload<T = any>(path: string, formData: FormData, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { formData, headers });
  }
}
