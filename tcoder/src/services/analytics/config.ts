export interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  redactSecrets: boolean;
  includeSessionData: boolean;
  apiKey?: string;
  tags?: Record<string, string>;
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: false,
  batchSize: 25,
  flushIntervalMs: 30000,
  maxQueueSize: 10000,
  redactSecrets: true,
  includeSessionData: false,
};

export function createAnalyticsConfig(overrides?: Partial<AnalyticsConfig>): AnalyticsConfig {
  return {
    ...DEFAULT_ANALYTICS_CONFIG,
    ...overrides,
  };
}
