import type { PolicyConfig, PolicyLimit, PolicyLimitResult, PolicyLimitType } from './types.ts';
import { MAX_CONVERSATION_MESSAGES, MAX_TOOL_CALLS_PER_TURN, FILE_SIZE_LIMIT } from '../../constants/common.ts';

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  limits: [],
  defaults: {
    maxTokensPerRequest: 16000,
    maxRequestsPerMinute: 20,
    maxRequestsPerDay: 1000,
    maxToolCallsPerTurn: MAX_TOOL_CALLS_PER_TURN,
    maxToolCallsPerHour: 500,
    maxTotalTokensPerSession: 1000000,
    maxConcurrentTools: 10,
    maxFileSizeBytes: FILE_SIZE_LIMIT,
    maxConversationMessages: MAX_CONVERSATION_MESSAGES,
  },
  enabled: true,
};

export class PolicyLimits {
  private config: PolicyConfig;
  private usage = new Map<string, { count: number; windowStart: number }>();
  private sessionTokens = 0;
  private turnToolCalls = 0;

  constructor(config?: Partial<PolicyConfig>) {
    this.config = {
      ...DEFAULT_POLICY_CONFIG,
      ...config,
      defaults: {
        ...DEFAULT_POLICY_CONFIG.defaults,
        ...config?.defaults,
      },
    };
  }

  checkLimit(type: PolicyLimitType, value: number): PolicyLimitResult {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const defaults = this.config.defaults;

    switch (type) {
      case 'tokens_per_request': {
        if (value > defaults.maxTokensPerRequest) {
          return {
            allowed: false,
            reason: `Request uses ${value} tokens, limit is ${defaults.maxTokensPerRequest}`,
            currentUsage: value,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: value, remaining: defaults.maxTokensPerRequest - value };
      }

      case 'requests_per_minute': {
        return this.checkRateLimit(
          'requests_per_minute',
          defaults.maxRequestsPerMinute,
          60000,
          value,
        );
      }

      case 'requests_per_day': {
        return this.checkRateLimit(
          'requests_per_day',
          defaults.maxRequestsPerDay,
          86400000,
          value,
        );
      }

      case 'tool_calls_per_turn': {
        if (this.turnToolCalls + value > defaults.maxToolCallsPerTurn) {
          return {
            allowed: false,
            reason: `Too many tool calls this turn: ${this.turnToolCalls}/${defaults.maxToolCallsPerTurn}`,
            currentUsage: this.turnToolCalls,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: this.turnToolCalls, remaining: defaults.maxToolCallsPerTurn - this.turnToolCalls };
      }

      case 'tool_calls_per_hour': {
        return this.checkRateLimit(
          'tool_calls_per_hour',
          defaults.maxToolCallsPerHour,
          3600000,
          value,
        );
      }

      case 'total_tokens_per_session': {
        if (this.sessionTokens + value > defaults.maxTotalTokensPerSession) {
          return {
            allowed: false,
            reason: `Session token limit exceeded: ${this.sessionTokens}/${defaults.maxTotalTokensPerSession}`,
            currentUsage: this.sessionTokens,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: this.sessionTokens, remaining: defaults.maxTotalTokensPerSession - this.sessionTokens };
      }

      case 'concurrent_tools': {
        if (value > defaults.maxConcurrentTools) {
          return {
            allowed: false,
            reason: `Too many concurrent tools: ${value}/${defaults.maxConcurrentTools}`,
            currentUsage: value,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: value };
      }

      case 'file_size': {
        if (value > defaults.maxFileSizeBytes) {
          const sizeMB = (value / (1024 * 1024)).toFixed(1);
          const limitMB = (defaults.maxFileSizeBytes / (1024 * 1024)).toFixed(1);
          return {
            allowed: false,
            reason: `File size ${sizeMB}MB exceeds limit of ${limitMB}MB`,
            currentUsage: value,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: value, remaining: defaults.maxFileSizeBytes - value };
      }

      case 'conversation_messages': {
        if (value > defaults.maxConversationMessages) {
          return {
            allowed: false,
            reason: `Too many messages: ${value}/${defaults.maxConversationMessages}`,
            currentUsage: value,
            remaining: 0,
          };
        }
        return { allowed: true, currentUsage: value, remaining: defaults.maxConversationMessages - value };
      }

      default:
        return { allowed: true };
    }
  }

  checkCustomLimit(limitId: string, value: number): PolicyLimitResult {
    if (!this.config.enabled) return { allowed: true };

    const limit = this.config.limits.find((l) => l.id === limitId);
    if (!limit) return { allowed: true };

    if (value > limit.max) {
      return {
        allowed: false,
        limit,
        reason: `Custom limit '${limit.name}' exceeded: ${value}/${limit.max}`,
        currentUsage: value,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      limit,
      currentUsage: value,
      remaining: limit.max - value,
    };
  }

  recordTokenUsage(tokens: number): void {
    this.sessionTokens += tokens;
  }

  recordToolCall(): void {
    this.turnToolCalls++;
  }

  resetTurn(): void {
    this.turnToolCalls = 0;
  }

  resetSession(): void {
    this.sessionTokens = 0;
    this.usage.clear();
  }

  addCustomLimit(limit: PolicyLimit): void {
    const existing = this.config.limits.findIndex((l) => l.id === limit.id);
    if (existing >= 0) {
      this.config.limits[existing] = limit;
    } else {
      this.config.limits.push(limit);
    }
  }

  removeCustomLimit(limitId: string): void {
    this.config.limits = this.config.limits.filter((l) => l.id !== limitId);
  }

  getConfig(): PolicyConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getSessionTokenUsage(): number {
    return this.sessionTokens;
  }

  private checkRateLimit(
    type: string,
    max: number,
    windowMs: number,
    increment: number,
  ): PolicyLimitResult {
    const now = Date.now();
    const entry = this.usage.get(type);

    if (!entry || now - entry.windowStart > windowMs) {
      this.usage.set(type, { count: increment, windowStart: now });
      return { allowed: true, currentUsage: increment, remaining: max - increment };
    }

    if (entry.count + increment > max) {
      const resetAt = entry.windowStart + windowMs;
      return {
        allowed: false,
        reason: `Rate limit '${type}' exceeded: ${entry.count}/${max}`,
        resetAt,
        currentUsage: entry.count,
        remaining: 0,
      };
    }

    entry.count += increment;
    return {
      allowed: true,
      currentUsage: entry.count,
      remaining: max - entry.count,
    };
  }
}

export const policyLimits = new PolicyLimits();
