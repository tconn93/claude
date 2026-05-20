export type ActivityType =
  | 'thinking'
  | 'tool_use'
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'bash'
  | 'web_search'
  | 'web_fetch'
  | 'mcp'
  | 'idle';

export interface ActivityEntry {
  type: ActivityType;
  startedAt: number;
  endedAt: number | null;
  duration: number;
  metadata?: Record<string, unknown>;
}

export class ActivityManager {
  private currentActivity: ActivityEntry | null = null;
  private history: ActivityEntry[] = [];
  private maxHistory: number;
  private listeners: Array<(entry: ActivityEntry) => void> = [];

  constructor(maxHistory = 1000) {
    this.maxHistory = maxHistory;
  }

  start(type: ActivityType, metadata?: Record<string, unknown>): void {
    if (this.currentActivity) {
      this.end();
    }

    this.currentActivity = {
      type,
      startedAt: Date.now(),
      endedAt: null,
      duration: 0,
      metadata,
    };
  }

  end(): ActivityEntry | null {
    if (!this.currentActivity) return null;

    const entry: ActivityEntry = {
      ...this.currentActivity,
      endedAt: Date.now(),
      duration: Date.now() - this.currentActivity.startedAt,
    };

    this.history.push(entry);

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    for (const listener of this.listeners) {
      listener(entry);
    }

    this.currentActivity = null;
    return entry;
  }

  getCurrent(): ActivityEntry | null {
    if (!this.currentActivity) return null;
    return { ...this.currentActivity, duration: Date.now() - this.currentActivity.startedAt };
  }

  getCurrentType(): ActivityType | null {
    return this.currentActivity?.type ?? null;
  }

  isActive(): boolean {
    return this.currentActivity !== null;
  }

  getHistory(limit = 50): ActivityEntry[] {
    return this.history.slice(-limit);
  }

  getHistorySince(timestamp: number): ActivityEntry[] {
    return this.history.filter(e => e.startedAt >= timestamp);
  }

  getTotalTimeByType(type: ActivityType): number {
    return this.history
      .filter(e => e.type === type)
      .reduce((sum, e) => sum + e.duration, 0);
  }

  getStats(): Record<ActivityType, { count: number; totalMs: number }> {
    const stats: Record<string, { count: number; totalMs: number }> = {};

    for (const entry of this.history) {
      if (!stats[entry.type]) {
        stats[entry.type] = { count: 0, totalMs: 0 };
      }
      stats[entry.type].count++;
      stats[entry.type].totalMs += entry.duration;
    }

    return stats as Record<ActivityType, { count: number; totalMs: number }>;
  }

  onActivity(callback: (entry: ActivityEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  clear(): void {
    this.currentActivity = null;
    this.history = [];
  }

  clearHistory(): void {
    this.history = [];
  }
}

export function createActivityManager(maxHistory?: number): ActivityManager {
  return new ActivityManager(maxHistory);
}
