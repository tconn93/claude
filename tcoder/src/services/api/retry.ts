import { HttpError, type HttpRequestOptions, type HttpResponse } from './client.ts';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export function shouldRetry(error: unknown, retryCount: number, config: RetryConfig): boolean {
  if (retryCount >= config.maxRetries) {
    return false;
  }

  if (error instanceof HttpError) {
    return config.retryableStatuses.includes(error.status);
  }

  return true;
}

export function getRetryDelay(retryCount: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, config.maxDelayMs);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<HttpResponse<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<HttpResponse<T>> {
  let lastError: unknown;
  let retryCount = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, retryCount, config)) {
        throw error;
      }

      retryCount++;
      const delay = getRetryDelay(retryCount, config);
      await sleep(delay);
    }
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return [429, 500, 502, 503, 504].includes(error.status);
  }
  return true;
}

export function createRetryableOperation<T>(
  requestFn: (options: HttpRequestOptions) => Promise<HttpResponse<T>>,
  options: HttpRequestOptions,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): () => Promise<HttpResponse<T>> {
  return () => requestFn(options);
}
