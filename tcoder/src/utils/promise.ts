export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message ?? `Promise timed out after ${ms}ms`));
    }, ms);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: 'fixed' | 'exponential';
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const retries = options.retries ?? 3;
  const delay = options.delay ?? 1000;
  const backoff = options.backoff ?? 'exponential';
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (options.shouldRetry && !options.shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt < retries) {
        const waitMs = backoff === 'exponential'
          ? delay * Math.pow(2, attempt)
          : delay;

        options.onRetry?.(attempt + 1, lastError);
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export function allSettledWithErrors<T>(promises: Promise<T>[]): Promise<{
  fulfilled: T[];
  rejected: { reason: unknown }[];
}> {
  return Promise.allSettled(promises).then(results => {
    const fulfilled: T[] = [];
    const rejected: Array<{ reason: unknown }> = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        fulfilled.push(result.value);
      } else {
        rejected.push({ reason: result.reason });
      }
    }

    return { fulfilled, rejected };
  });
}

export async function raceWithWinner<T>(promises: Promise<T>[]): Promise<{ value: T; index: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;

    promises.forEach((promise, index) => {
      promise
        .then(value => {
          if (!settled) {
            settled = true;
            resolve({ value, index });
          }
        })
        .catch(err => {
          // Continue waiting for other promises
        });
    });

    Promise.allSettled(promises).then(results => {
      if (!settled) {
        const allRejected = results.every(r => r.status === 'rejected');
        if (allRejected) {
          reject(new Error('All promises rejected'));
        }
      }
    });
  });
}

export function pMap<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>,
  concurrency = Infinity,
): Promise<U[]> {
  if (items.length === 0) return Promise.resolve([]);

  const results: U[] = new Array(items.length);
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  return Promise.all(workers).then(() => results);
}

export function runWithTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  fallback?: () => T | Promise<T>,
): Promise<T> {
  return timeout(fn(), ms).catch(err => {
    if (fallback) return fallback();
    throw err;
  });
}
