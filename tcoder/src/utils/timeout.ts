export class TimeoutError extends Error {
  public timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(timeoutMs, message));
    }, timeoutMs);

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

export function withTimeoutFn<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message?: string,
): Promise<T> {
  return withTimeout(fn(), timeoutMs, message);
}

export function createTimeoutController(timeoutMs: number, reason?: string): AbortController {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(reason ?? `Timeout after ${timeoutMs}ms`);
  }, timeoutMs);

  const originalAbort = controller.abort.bind(controller);
  controller.abort = (abortReason?: unknown) => {
    clearTimeout(timer);
    originalAbort(abortReason);
  };

  return controller;
}

export class TimeoutManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  set(id: string, callback: () => void, ms: number): void {
    this.clear(id);
    const timer = setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, ms);
    this.timers.set(id, timer);
  }

  clear(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  clearAll(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  has(id: string): boolean {
    return this.timers.has(id);
  }

  get size(): number {
    return this.timers.size;
  }
}

export function setSafeTimeout(callback: () => void, ms: number): () => void {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
}

export function setSafeInterval(callback: () => void, ms: number): () => void {
  const timer = setInterval(callback, ms);
  return () => clearInterval(timer);
}
