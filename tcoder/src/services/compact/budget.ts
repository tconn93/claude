import { DEFAULT_MAX_TOKENS } from '../../constants/common.ts';

export interface TokenBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  currentInputTokens: number;
  currentOutputTokens: number;
  reservedSystemPrompt: number;
  reservedTools: number;
}

export class BudgetManager {
  private budgets = new Map<string, TokenBudget>();

  private defaultBudget: TokenBudget = {
    maxInputTokens: 180000,
    maxOutputTokens: DEFAULT_MAX_TOKENS,
    currentInputTokens: 0,
    currentOutputTokens: 0,
    reservedSystemPrompt: 2000,
    reservedTools: 5000,
  };

  createBudget(sessionId: string, overrides?: Partial<TokenBudget>): TokenBudget {
    const budget: TokenBudget = {
      ...this.defaultBudget,
      ...overrides,
    };
    this.budgets.set(sessionId, budget);
    return budget;
  }

  getBudget(sessionId: string): TokenBudget {
    return this.budgets.get(sessionId) ?? this.createBudget(sessionId);
  }

  updateBudget(sessionId: string, update: Partial<TokenBudget>): TokenBudget {
    const existing = this.getBudget(sessionId);
    const updated: TokenBudget = { ...existing, ...update };
    this.budgets.set(sessionId, updated);
    return updated;
  }

  getAvailableInputTokens(sessionId: string): number {
    const budget = this.getBudget(sessionId);
    const available = budget.maxInputTokens - budget.currentInputTokens - budget.reservedSystemPrompt - budget.reservedTools;
    return Math.max(0, available);
  }

  getAvailableOutputTokens(sessionId: string): number {
    const budget = this.getBudget(sessionId);
    return Math.max(0, budget.maxOutputTokens - budget.currentOutputTokens);
  }

  trackInputTokens(sessionId: string, tokens: number): void {
    const budget = this.getBudget(sessionId);
    budget.currentInputTokens += tokens;
  }

  trackOutputTokens(sessionId: string, tokens: number): void {
    const budget = this.getBudget(sessionId);
    budget.currentOutputTokens += tokens;
  }

  reset(sessionId: string): void {
    const budget = this.getBudget(sessionId);
    budget.currentInputTokens = 0;
    budget.currentOutputTokens = 0;
  }

  removeBudget(sessionId: string): void {
    this.budgets.delete(sessionId);
  }

  isExceeded(sessionId: string): boolean {
    const available = this.getAvailableInputTokens(sessionId);
    return available <= 0;
  }

  getUsageRatio(sessionId: string): number {
    const budget = this.getBudget(sessionId);
    const totalUsed = budget.currentInputTokens + budget.currentOutputTokens;
    const totalMax = budget.maxInputTokens + budget.maxOutputTokens;
    return totalMax > 0 ? totalUsed / totalMax : 0;
  }

  getBudgetSummary(sessionId: string): {
    maxInput: number;
    usedInput: number;
    availableInput: number;
    usagePercent: number;
  } {
    const budget = this.getBudget(sessionId);
    const available = this.getAvailableInputTokens(sessionId);
    return {
      maxInput: budget.maxInputTokens,
      usedInput: budget.currentInputTokens,
      availableInput: available,
      usagePercent: Math.round((budget.currentInputTokens / budget.maxInputTokens) * 100),
    };
  }
}
