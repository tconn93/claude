export class AbortControllerHelper {
  private controllers: Map<string, AbortController> = new Map();

  create(id: string): AbortController {
    this.abort(id);
    const controller = new AbortController();
    this.controllers.set(id, controller);
    return controller;
  }

  get(id: string): AbortController | undefined {
    return this.controllers.get(id);
  }

  getOrCreate(id: string): AbortController {
    return this.controllers.get(id) ?? this.create(id);
  }

  abort(id: string, reason?: string): boolean {
    const controller = this.controllers.get(id);
    if (!controller) return false;

    controller.abort(reason);
    this.controllers.delete(id);
    return true;
  }

  abortAll(reason?: string): void {
    for (const [id, controller] of this.controllers) {
      controller.abort(reason);
    }
    this.controllers.clear();
  }

  remove(id: string): boolean {
    return this.controllers.delete(id);
  }

  signal(id: string): AbortSignal | undefined {
    return this.controllers.get(id)?.signal;
  }

  has(id: string): boolean {
    return this.controllers.has(id);
  }

  get size(): number {
    return this.controllers.size;
  }

  get activeCount(): number {
    let count = 0;
    for (const controller of this.controllers.values()) {
      if (!controller.signal.aborted) count++;
    }
    return count;
  }

  get abortedCount(): number {
    let count = 0;
    for (const controller of this.controllers.values()) {
      if (controller.signal.aborted) count++;
    }
    return count;
  }

  get activeIds(): string[] {
    const ids: string[] = [];
    for (const [id, controller] of this.controllers) {
      if (!controller.signal.aborted) ids.push(id);
    }
    return ids;
  }
}

export function createAbortController(id?: string): AbortController {
  return new AbortController();
}

export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(`Timeout after ${timeoutMs}ms`), timeoutMs);
  return controller;
}

export function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (!signal) continue;

    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener('abort', () => {
      controller.abort(signal.reason);
    }, { once: true });
  }

  return controller.signal;
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted ?? false;
}
