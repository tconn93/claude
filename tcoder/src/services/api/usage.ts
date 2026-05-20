import type { TokenUsage } from '../../types/message.ts';

export interface UsageRecord {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  totalTokens: number;
  totalRequests: number;
  models: Record<string, { inputTokens: number; outputTokens: number; requests: number }>;
}

export interface UsageBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  currentInputTokens: number;
  currentOutputTokens: number;
  windowMs: number;
}

export class TokenUsageTracker {
  private records: UsageRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords = 10000) {
    this.maxRecords = maxRecords;
  }

  record(model: string, usage: TokenUsage): UsageRecord {
    const record: UsageRecord = {
      timestamp: Date.now(),
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationTokens: usage.cacheCreationInputTokens ?? 0,
      cacheReadTokens: usage.cacheReadInputTokens ?? 0,
      totalTokens: usage.inputTokens + usage.outputTokens,
    };

    this.records.push(record);

    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    return record;
  }

  getSummary(since?: number): UsageSummary {
    const filtered = since
      ? this.records.filter((r) => r.timestamp >= since)
      : this.records;

    const models: UsageSummary['models'] = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheCreationTokens = 0;
    let totalCacheReadTokens = 0;

    for (const record of filtered) {
      totalInputTokens += record.inputTokens;
      totalOutputTokens += record.outputTokens;
      totalCacheCreationTokens += record.cacheCreationTokens;
      totalCacheReadTokens += record.cacheReadTokens;

      if (!models[record.model]) {
        models[record.model] = { inputTokens: 0, outputTokens: 0, requests: 0 };
      }
      models[record.model].inputTokens += record.inputTokens;
      models[record.model].outputTokens += record.outputTokens;
      models[record.model].requests++;
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCacheCreationTokens,
      totalCacheReadTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalRequests: filtered.length,
      models,
    };
  }

  getSessionSummary(sessionId: string): UsageSummary {
    return this.getSummary();
  }

  isWithinBudget(budget: UsageBudget): boolean {
    const now = Date.now();
    const windowStart = now - budget.windowMs;
    const recent = this.records.filter((r) => r.timestamp >= windowStart);

    const currentInputTokens = recent.reduce((sum, r) => sum + r.inputTokens, 0);
    const currentOutputTokens = recent.reduce((sum, r) => sum + r.outputTokens, 0);

    return (
      currentInputTokens < budget.maxInputTokens &&
      currentOutputTokens < budget.maxOutputTokens &&
      currentInputTokens + currentOutputTokens < budget.maxTotalTokens
    );
  }

  reset(): void {
    this.records = [];
  }

  getRecordCount(): number {
    return this.records.length;
  }

  getRecentRecords(count: number): UsageRecord[] {
    return this.records.slice(-count);
  }

  estimateCost(costPerInput1k: number, costPerOutput1k: number): number {
    const summary = this.getSummary();
    return (
      (summary.totalInputTokens / 1000) * costPerInput1k +
      (summary.totalOutputTokens / 1000) * costPerOutput1k
    );
  }
}

export const defaultTracker = new TokenUsageTracker();
