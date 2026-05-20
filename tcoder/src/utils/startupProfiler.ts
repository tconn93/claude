export interface ProfilerEntry {
  label: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export class StartupProfiler {
  private entries: ProfilerEntry[] = [];
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  start(label: string): void {
    this.checkpoints.set(label, Date.now());
  }

  end(label: string, metadata?: Record<string, unknown>): ProfilerEntry {
    const startTime = this.checkpoints.get(label) ?? this.startTime;
    const endTime = Date.now();
    const entry: ProfilerEntry = {
      label,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    };

    this.entries.push(entry);
    this.checkpoints.delete(label);
    return entry;
  }

  record(label: string, duration: number, metadata?: Record<string, unknown>): ProfilerEntry {
    const entry: ProfilerEntry = {
      label,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      metadata,
    };

    this.entries.push(entry);
    return entry;
  }

  getEntries(): ProfilerEntry[] {
    return [...this.entries];
  }

  getTotalDuration(): number {
    return Date.now() - this.startTime;
  }

  getEntryByLabel(label: string): ProfilerEntry | undefined {
    return this.entries.find(e => e.label === label);
  }

  getSlowEntries(thresholdMs = 100): ProfilerEntry[] {
    return this.entries.filter(e => e.duration > thresholdMs);
  }

  generateReport(): string {
    const lines: string[] = [];
    const total = this.getTotalDuration();

    lines.push('Startup Profile Report');
    lines.push('='.repeat(40));
    lines.push(`Total startup time: ${total}ms`);
    lines.push('');

    const sorted = [...this.entries].sort((a, b) => b.duration - a.duration);

    for (const entry of sorted) {
      const percent = ((entry.duration / total) * 100).toFixed(1);
      const bar = '='.repeat(Math.max(1, Math.round(entry.duration / 10)));
      lines.push(`${entry.label.padEnd(30)} ${String(entry.duration).padStart(5)}ms (${percent}%) ${bar}`);
    }

    if (sorted.length === 0) {
      lines.push('No entries recorded.');
    }

    return lines.join('\n');
  }

  reset(): void {
    this.entries = [];
    this.checkpoints.clear();
    this.startTime = Date.now();
  }
}

export function createStartupProfiler(): StartupProfiler {
  return new StartupProfiler();
}

let globalProfiler: StartupProfiler | null = null;

export function getGlobalProfiler(): StartupProfiler {
  if (!globalProfiler) {
    globalProfiler = new StartupProfiler();
  }
  return globalProfiler;
}
