import type { ToolDefinition } from '../types/tool.ts';
import type { Message } from '../types/message.ts';

export interface QueryConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  messages: Message[];
  tools: ToolDefinition[];
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'tool'; name: string };
  thinkingBudget?: number;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface QueryResult {
  messages: Message[];
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'interrupted';
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
  cost: number;
  duration: number;
}

export interface StreamEvent {
  type: 'text' | 'tool_use' | 'thinking' | 'error' | 'done';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolId?: string;
  thinking?: string;
  error?: string;
  usage?: QueryResult['usage'];
}

export const DEFAULT_QUERY_CONFIG: Partial<QueryConfig> = {
  maxTokens: 8192,
  temperature: 0.7,
  thinkingBudget: 1024,
};
