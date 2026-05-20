export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Sleep aborted'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error('Sleep aborted'));
      }, { once: true });
    }
  });
}

export function sleepUntil(condition: () => boolean | Promise<boolean>, options?: {
  pollInterval?: number;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<void> {
  const pollInterval = options?.pollInterval ?? 100;
  const timeout = options?.timeout;
  const signal = options?.signal;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Sleep aborted'));
      return;
    }

    const check = async () => {
      if (signal?.aborted) {
        reject(signal.reason ?? new Error('Sleep aborted'));
        return;
      }

      if (timeout && Date.now() - startTime > timeout) {
        reject(new Error(`Timed out waiting for condition after ${timeout}ms`));
        return;
      }

      try {
        if (await condition()) {
          resolve();
          return;
        }
      } catch {
        // Condition check failed, continue polling
      }

      setTimeout(check, pollInterval);
    };

    check();
  });
}

export function sleepWithBackoff(
  baseMs: number,
  attempt: number,
  maxMs?: number,
): Promise<void> {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs ?? 30_000);
  return sleep(delay);
}

export function microtask(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve));
}

export function idleCallback(timeout?: number): Promise<void> {
  if (typeof requestIdleCallback !== 'undefined') {
    return new Promise(resolve => {
      requestIdleCallback(() => resolve(), { timeout });
    });
  }
  return sleep(0);
}

export function tick(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}
