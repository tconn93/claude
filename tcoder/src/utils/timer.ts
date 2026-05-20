export class Timer {
  private startTime: number;
  private laps: Array<{ label: string; time: number }> = [];
  private stopped = false;
  private endTime = 0;

  constructor() {
    this.startTime = performance.now();
  }

  static start(): Timer {
    return new Timer();
  }

  lap(label: string): number {
    const time = performance.now();
    this.laps.push({ label, time });
    return time - this.startTime;
  }

  elapsed(): number {
    if (this.stopped) {
      return this.endTime - this.startTime;
    }
    return performance.now() - this.startTime;
  }

  elapsedFormatted(): string {
    return formatTimerMs(this.elapsed());
  }

  stop(): number {
    if (!this.stopped) {
      this.endTime = performance.now();
      this.stopped = true;
    }
    return this.elapsed();
  }

  getLaps(): Array<{ label: string; elapsed: number; total: number }> {
    let previous = this.startTime;

    return this.laps.map(lap => {
      const elapsed = lap.time - previous;
      previous = lap.time;
      return {
        label: lap.label,
        elapsed,
        total: lap.time - this.startTime,
      };
    });
  }

  toString(): string {
    const lines: string[] = [];
    const total = this.elapsed();
    lines.push(`Total: ${formatTimerMs(total)}`);

    let previous = this.startTime;
    for (const lap of this.laps) {
      const elapsed = lap.time - previous;
      previous = lap.time;
      const pct = total > 0 ? ((elapsed / total) * 100).toFixed(1) : '0';
      lines.push(`  ${lap.label}: ${formatTimerMs(elapsed)} (${pct}%)`);
    }

    return lines.join('\n');
  }
}

export function time<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

export async function timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

export function formatTimerMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function benchmark(fn: () => void, iterations = 1): { total: number; average: number; perSecond: number } {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const total = performance.now() - start;
  const average = total / iterations;
  const perSecond = iterations / (total / 1000);

  return { total, average, perSecond };
}

export async function benchmarkAsync(
  fn: () => Promise<void>,
  iterations = 1,
): Promise<{ total: number; average: number; perSecond: number }> {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const total = performance.now() - start;
  const average = total / iterations;
  const perSecond = iterations / (total / 1000);

  return { total, average, perSecond };
}
