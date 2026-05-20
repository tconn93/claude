import { BACKGROUND_TASK_TIMEOUT } from '../constants/common.ts';

export type BackgroundTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask<T = unknown> {
  id: string;
  name: string;
  description: string;
  status: BackgroundTaskStatus;
  progress: number;
  result?: T;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  timeoutMs: number;
  abortController: AbortController;
  onUpdate?: (task: BackgroundTask<T>) => void;
  onComplete?: (task: BackgroundTask<T>) => void;
  onError?: (task: BackgroundTask<T>, error: Error) => void;
}

export interface BackgroundTaskOptions<T = unknown> {
  name: string;
  description?: string;
  timeoutMs?: number;
  onUpdate?: (task: BackgroundTask<T>) => void;
  onComplete?: (task: BackgroundTask<T>) => void;
  onError?: (task: BackgroundTask<T>, error: Error) => void;
}

let taskCounter = 0;

export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>();
  private maxConcurrent: number;
  private running: number = 0;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  create<T = unknown>(
    name: string,
    executor: (task: BackgroundTask<T>, signal: AbortSignal) => Promise<T>,
    options?: BackgroundTaskOptions<T>,
  ): BackgroundTask<T> {
    const id = `task_${++taskCounter}_${Date.now()}`;
    const abortController = new AbortController();

    const task: BackgroundTask<T> = {
      id,
      name,
      description: options?.description ?? '',
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      timeoutMs: options?.timeoutMs ?? BACKGROUND_TASK_TIMEOUT,
      abortController,
      onUpdate: options?.onUpdate,
      onComplete: options?.onComplete,
      onError: options?.onError,
    };

    this.tasks.set(id, task as unknown as BackgroundTask);

    // Start execution
    this.executeTask(task, executor);

    return task;
  }

  getTask<T = unknown>(id: string): BackgroundTask<T> | null {
    return (this.tasks.get(id) as BackgroundTask<T>) ?? null;
  }

  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  getActiveTasks(): BackgroundTask[] {
    return this.getAllTasks().filter((t) => t.status === 'running' || t.status === 'pending');
  }

  cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'pending' || task.status === 'running') {
      task.abortController.abort();
      task.status = 'cancelled';
      task.completedAt = Date.now();

      this.tasks.delete(id);

      if (task.status === 'running') {
        this.running--;
      }

      return true;
    }

    return false;
  }

  cancelAll(): void {
    for (const [id] of this.tasks) {
      this.cancelTask(id);
    }
  }

  updateProgress(id: string, progress: number): void {
    const task = this.tasks.get(id);
    if (task) {
      task.progress = Math.max(0, Math.min(100, progress));
      (task as BackgroundTask).onUpdate?.(task);
    }
  }

  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'pending': pending++; break;
        case 'running': running++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'cancelled': cancelled++; break;
      }
    }

    return {
      total: this.tasks.size,
      pending,
      running,
      completed,
      failed,
      cancelled,
    };
  }

  cleanup(maxAge = 3600000): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, task] of this.tasks) {
      if (
        (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') &&
        task.completedAt &&
        now - task.completedAt > maxAge
      ) {
        this.tasks.delete(id);
        removed++;
      }
    }

    return removed;
  }

  private async executeTask<T>(
    task: BackgroundTask<T>,
    executor: (task: BackgroundTask<T>, signal: AbortSignal) => Promise<T>,
  ): Promise<void> {
    if (this.running >= this.maxConcurrent) {
      return;
    }

    this.running++;
    task.status = 'running';
    task.startedAt = Date.now();
    (task as BackgroundTask).onUpdate?.(task);

    const timeout = setTimeout(() => {
      task.abortController.abort();
    }, task.timeoutMs);

    try {
      if (task.abortController.signal.aborted) {
        throw new Error('Task was cancelled');
      }

      const result = await executor(task, task.abortController.signal);
      clearTimeout(timeout);

      task.status = 'completed';
      task.result = result;
      task.progress = 100;
      task.completedAt = Date.now();
      (task as BackgroundTask).onUpdate?.(task);
      (task as BackgroundTask).onComplete?.(task);
    } catch (error) {
      clearTimeout(timeout);

      const isAborted = error instanceof DOMException && error.name === 'AbortError';

      task.status = isAborted ? 'cancelled' : 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = Date.now();

      if (!isAborted) {
        (task as BackgroundTask).onError?.(task, error instanceof Error ? error : new Error(String(error)));
      }

      (task as BackgroundTask).onUpdate?.(task);
    } finally {
      clearTimeout(timeout);
      this.running--;
    }
  }
}

export const backgroundTaskManager = new BackgroundTaskManager();
