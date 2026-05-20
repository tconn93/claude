import { APP_NAME, APP_VERSION, SANDBOX_TIMEOUT } from '../../constants/common.ts';

export interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

export class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private controller: AbortController | null = null;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? SANDBOX_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': `${APP_NAME}/${APP_VERSION}`,
      ...config.headers,
    };
  }

  async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${options.path}`;
    const timeout = options.timeout ?? this.timeout;
    const signal = options.signal ?? this.createTimeoutSignal(timeout).signal;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      signal,
    };

    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else if (contentType.includes('text/event-stream')) {
        data = (await response.text()) as unknown as T;
      } else {
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        throw new HttpError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          data as Record<string, unknown>,
        );
      }

      return {
        status: response.status,
        headers: responseHeaders,
        data,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new HttpError(408, 'Request timeout', { reason: 'aborted' });
      }
      throw new HttpError(0, `Network error: ${String(error)}`, { reason: String(error) });
    }
  }

  async streamRequest(options: HttpRequestOptions): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}${options.path}`;
    const timeout = options.timeout ?? this.timeout;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      Accept: 'text/event-stream',
      ...options.headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal ?? this.createTimeoutSignal(timeout).signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new HttpError(response.status, `HTTP ${response.status}: ${errorBody}`, {
        reason: errorBody,
      });
    }

    const body = response.body;
    if (!body) {
      throw new HttpError(500, 'No response body', { reason: 'empty body' });
    }

    return body;
  }

  abort(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  private createTimeoutSignal(ms: number): { signal: AbortSignal } {
    this.controller = new AbortController();
    setTimeout(() => {
      this.controller?.abort();
    }, ms);
    return { signal: this.controller.signal };
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    this.defaultHeaders['Authorization'] = `Bearer ${key}`;
  }
}

export class HttpError extends Error {
  public status: number;
  public body: Record<string, unknown>;

  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}
