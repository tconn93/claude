export interface ThinkingConfig {
  enabled: boolean;
  budgetTokens?: number;
  interleaved?: boolean;
}

export const DEFAULT_THINKING_CONFIG: ThinkingConfig = {
  enabled: true,
  budgetTokens: 1024,
  interleaved: false,
};

export function getThinkingConfig(overrides?: Partial<ThinkingConfig>): ThinkingConfig {
  return {
    ...DEFAULT_THINKING_CONFIG,
    ...overrides,
  };
}

export function isThinkingEnabled(config: ThinkingConfig): boolean {
  return config.enabled && (config.budgetTokens ?? 0) > 0;
}

export function getThinkingBudget(config: ThinkingConfig): number {
  return config.budgetTokens ?? DEFAULT_THINKING_CONFIG.budgetTokens!;
}
