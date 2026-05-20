import type { Task } from './types.ts';

class TaskStore {
  private tasks = new Map<string, Task>();

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  set(id: string, task: Task): void {
    this.tasks.set(id, task);
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  list(filter?: { status?: string; assignedTo?: string; limit?: number }): Task[] {
    let results = Array.from(this.tasks.values());

    if (filter?.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    if (filter?.assignedTo) {
      results = results.filter((t) => t.assignedTo === filter.assignedTo);
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt);

    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  clear(): void {
    this.tasks.clear();
  }

  get size(): number {
    return this.tasks.size;
  }
}

export const taskStore = new TaskStore();
