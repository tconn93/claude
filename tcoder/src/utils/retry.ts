export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryOn?: (error: Error) => boolean;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
  signal?: AbortSignal;
}

export class Retrier {
  private options: Required<RetryOptions>;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30_000,
      backoffFactor: options.backoffFactor ?? 2,
      jitter: options.jitter ?? true,
      retryOn: options.retryOn ?? (() => true),
      onRetry: options.onRetry ?? (() => {}),
      signal: options.signal ?? new AbortController().signal,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      if (this.options.signal.aborted) {
        throw new Error('Retry aborted');
      }

      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt >= this.options.maxRetries) {
          throw lastError;
        }

        if (!this.options.retryOn(lastError)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        this.options.onRetry(attempt + 1, delay, lastError);
        await this.wait(delay, this.options.signal);
      }
    }

    throw lastError ?? new Error('Retry failed');
  }

  async executeWithBackoff<T>(
    fn: (attempt: number) => Promise<T>,
  ): Promise<T> {
    return this.execute(async () => {
      let currentAttempt = 0;

      while (currentAttempt <= this.options.maxRetries) {
        try {
          return await fn(currentAttempt);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));

          if (currentAttempt >= this.options.maxRetries) {
            throw error;
          }

          if (!this.options.retryOn(error)) {
            throw error;
          }

          const delay = this.calculateDelay(currentAttempt);
          this.options.onRetry(currentAttempt + 1, delay, error);
          await this.wait(delay, this.options.signal);
          currentAttempt++;
        }
      }

      throw new Error('Retry failed');
    });
  }

  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.options.initialDelay * Math.pow(this.options.backoffFactor, attempt),
      this.options.maxDelay,
    );

    if (this.options.jitter) {
      return Math.floor(delay * (0.5 + Math.random() * 0.5));
    }

    return delay;
  }

  private wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Retry aborted'));
        return;
      }

      const timer = setTimeout(resolve, ms);

      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Retry aborted'));
      }, { once: true });
    });
  }
}

export function createRetrier(options?: RetryOptions): Retrier {
  return new Retrier(options);
}

export function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
    'EPIPE', 'ESOCKETTIMEDOUT', 'network', 'timeout',
    'rate limit', 'too many requests', '503', '502', '504',
    'internal server error', 'service unavailable',
  ];

  const message = error.message.toLowerCase();
  return retryableMessages.some(m => message.includes(m.toLowerCase()));
}
