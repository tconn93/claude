import type { TokenUsage } from './types/message.ts';

export interface TurnCost {
  turnIndex: number;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costCents: number;
}

export interface SessionCost {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  totalTokens: number;
  totalCostCents: number;
  turnCount: number;
  turns: TurnCost[];
}

const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number; cacheWritePerM: number; cacheReadPerM: number }> = {
  'grok-4.3': { inputPerM: 5.0, outputPerM: 15.0, cacheWritePerM: 0, cacheReadPerM: 0 },
  'grok-4.x': { inputPerM: 2.0, outputPerM: 8.0, cacheWritePerM: 0, cacheReadPerM: 0 },
  'grok-4': { inputPerM: 0.50, outputPerM: 2.0, cacheWritePerM: 0, cacheReadPerM: 0 },
};

export function getModelPricing(model: string): { inputPerM: number; outputPerM: number; cacheWritePerM: number; cacheReadPerM: number } {
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  const baseMatch = Object.keys(MODEL_PRICING).find(key => model.startsWith(key));
  if (baseMatch) {
    return MODEL_PRICING[baseMatch];
  }
  return { inputPerM: 2.0, outputPerM: 8.0, cacheWritePerM: 0, cacheReadPerM: 0 };
}

export class CostTracker {
  private session: SessionCost;
  private turnIndex = 0;

  constructor() {
    this.session = this.emptySession();
  }

  recordTurn(model: string, usage: TokenUsage): TurnCost {
    const pricing = getModelPricing(model);
    const turn: TurnCost = {
      turnIndex: this.turnIndex++,
      timestamp: Date.now(),
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationTokens: usage.cacheCreationInputTokens ?? 0,
      cacheReadTokens: usage.cacheReadInputTokens ?? 0,
      totalTokens: usage.inputTokens + usage.outputTokens,
      costCents: 0,
    };

    turn.costCents = this.calculateCost(
      turn.inputTokens,
      turn.outputTokens,
      turn.cacheCreationTokens,
      turn.cacheReadTokens,
      pricing,
    );

    this.session.totalInputTokens += turn.inputTokens;
    this.session.totalOutputTokens += turn.outputTokens;
    this.session.totalCacheCreationTokens += turn.cacheCreationTokens;
    this.session.totalCacheReadTokens += turn.cacheReadTokens;
    this.session.totalTokens += turn.totalTokens;
    this.session.totalCostCents += turn.costCents;
    this.session.turnCount++;
    this.session.turns.push(turn);

    return turn;
  }

  getSessionCost(): SessionCost {
    return { ...this.session, turns: [...this.session.turns] };
  }

  getTotalCostFormatted(): string {
    return formatCost(this.session.totalCostCents);
  }

  getSessionSummary(): string {
    return [
      `Turns: ${this.session.turnCount}`,
      `Input tokens: ${formatTokens(this.session.totalInputTokens)}`,
      `Output tokens: ${formatTokens(this.session.totalOutputTokens)}`,
      `Cache creation: ${formatTokens(this.session.totalCacheCreationTokens)}`,
      `Cache read: ${formatTokens(this.session.totalCacheReadTokens)}`,
      `Total tokens: ${formatTokens(this.session.totalTokens)}`,
      `Total cost: ${this.getTotalCostFormatted()}`,
    ].join('\n');
  }

  reset(): void {
    this.session = this.emptySession();
    this.turnIndex = 0;
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number,
    cacheReadTokens: number,
    pricing: { inputPerM: number; outputPerM: number; cacheWritePerM: number; cacheReadPerM: number },
  ): number {
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerM * 100;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerM * 100;
    const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.cacheWritePerM * 100;
    const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheReadPerM * 100;
    return Math.round(inputCost + outputCost + cacheWriteCost + cacheReadCost);
  }

  private emptySession(): SessionCost {
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      totalTokens: 0,
      totalCostCents: 0,
      turnCount: 0,
      turns: [],
    };
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function formatCost(cents: number): string {
  if (cents >= 100) return `$${(cents / 100).toFixed(2)}`;
  return `${cents.toFixed(1)}c`;
}

let trackerInstance: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!trackerInstance) {
    trackerInstance = new CostTracker();
  }
  return trackerInstance;
}
