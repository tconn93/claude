export interface DenialEntry {
  toolName: string;
  reason: string;
  timestamp: number;
  sessionId: string;
  args?: Record<string, unknown>;
}

export interface DenialStats {
  totalDenials: number;
  deniedTools: Map<string, number>;
  lastDenial: DenialEntry | null;
}

export class DenialTracker {
  private denials: DenialEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  record(toolName: string, reason: string, sessionId: string, args?: Record<string, unknown>): void {
    const entry: DenialEntry = {
      toolName,
      reason,
      timestamp: Date.now(),
      sessionId,
      args,
    };

    this.denials.push(entry);

    if (this.denials.length > this.maxEntries) {
      this.denials = this.denials.slice(-this.maxEntries);
    }
  }

  getRecent(limit = 50): DenialEntry[] {
    return this.denials.slice(-limit);
  }

  getByTool(toolName: string): DenialEntry[] {
    return this.denials.filter(d => d.toolName === toolName);
  }

  getBySession(sessionId: string): DenialEntry[] {
    return this.denials.filter(d => d.sessionId === sessionId);
  }

  getStats(): DenialStats {
    const deniedTools = new Map<string, number>();

    for (const denial of this.denials) {
      const count = deniedTools.get(denial.toolName) ?? 0;
      deniedTools.set(denial.toolName, count + 1);
    }

    return {
      totalDenials: this.denials.length,
      deniedTools,
      lastDenial: this.denials.length > 0 ? this.denials[this.denials.length - 1] : null,
    };
  }

  clear(): void {
    this.denials = [];
  }

  clearTool(toolName: string): void {
    this.denials = this.denials.filter(d => d.toolName !== toolName);
  }

  clearSession(sessionId: string): void {
    this.denials = this.denials.filter(d => d.sessionId !== sessionId);
  }

  toJSON(): DenialEntry[] {
    return [...this.denials];
  }

  fromJSON(entries: DenialEntry[]): void {
    this.denials = entries.slice(-this.maxEntries);
  }

  get count(): number {
    return this.denials.length;
  }
}

export function createDenialTracker(maxEntries?: number): DenialTracker {
  return new DenialTracker(maxEntries);
}
