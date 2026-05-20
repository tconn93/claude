export interface PolicyLimit {
  id: string;
  name: string;
  description: string;
  current: number;
  max: number;
  windowMs: number;
  resetAt?: number;
  warnAt?: number;
  blockAt?: number;
}

export interface PolicyConfig {
  limits: PolicyLimit[];
  defaults: {
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
    maxRequestsPerDay: number;
    maxToolCallsPerTurn: number;
    maxToolCallsPerHour: number;
    maxTotalTokensPerSession: number;
    maxConcurrentTools: number;
    maxFileSizeBytes: number;
    maxConversationMessages: number;
  };
  enabled: boolean;
}

export interface PolicyLimitResult {
  allowed: boolean;
  limit?: PolicyLimit;
  reason?: string;
  resetAt?: number;
  currentUsage?: number;
  remaining?: number;
}

export type PolicyLimitType =
  | 'tokens_per_request'
  | 'requests_per_minute'
  | 'requests_per_day'
  | 'tool_calls_per_turn'
  | 'tool_calls_per_hour'
  | 'total_tokens_per_session'
  | 'concurrent_tools'
  | 'file_size'
  | 'conversation_messages';
