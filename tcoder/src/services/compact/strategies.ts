import type { Message, TokenUsage } from '../../types/message.ts';

export type CompactionStrategy = 'summarize' | 'truncate' | 'hybrid';

export interface StrategyMetrics {
  messageCount: number;
  estimatedTokens: number;
  toolUseRatio: number;
  averageMessageLength: number;
  hasLongMessages: boolean;
  ageMs: number;
}

export function analyzeMessages(messages: Message[]): StrategyMetrics {
  if (messages.length === 0) {
    return {
      messageCount: 0,
      estimatedTokens: 0,
      toolUseRatio: 0,
      averageMessageLength: 0,
      hasLongMessages: false,
      ageMs: 0,
    };
  }

  let totalChars = 0;
  let longestMessage = 0;
  let toolUseCount = 0;
  let totalAge = 0;
  let messageCount = 0;

  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const length = content.length;
    totalChars += length;
    longestMessage = Math.max(longestMessage, length);
    messageCount++;

    if (msg.type === 'assistant' && Array.isArray(msg.content)) {
      const hasToolUse = msg.content.some((block) => block.type === 'tool_use');
      if (hasToolUse) toolUseCount++;
    }

    if ('timestamp' in msg && msg.timestamp) {
      totalAge += Date.now() - msg.timestamp;
    }
  }

  return {
    messageCount,
    estimatedTokens: Math.ceil(totalChars / 4),
    toolUseRatio: messageCount > 0 ? toolUseCount / messageCount : 0,
    averageMessageLength: Math.ceil(totalChars / messageCount),
    hasLongMessages: longestMessage > 5000,
    ageMs: messageCount > 0 ? Math.ceil(totalAge / messageCount) : 0,
  };
}

export function selectCompactionStrategy(messages: Message[]): CompactionStrategy {
  const metrics = analyzeMessages(messages);

  if (metrics.messageCount > 500) {
    return 'truncate';
  }

  if (metrics.estimatedTokens > 100000) {
    return 'truncate';
  }

  if (metrics.hasLongMessages) {
    return 'hybrid';
  }

  if (metrics.averageMessageLength < 200 && metrics.messageCount > 200) {
    return 'summarize';
  }

  return 'hybrid';
}

export function getStrategyPriority(strategy: CompactionStrategy): number {
  switch (strategy) {
    case 'truncate': return 1;
    case 'hybrid': return 2;
    case 'summarize': return 3;
  }
}

export function describeStrategy(strategy: CompactionStrategy): string {
  switch (strategy) {
    case 'summarize':
      return 'Summarize older messages into a compact context block';
    case 'truncate':
      return 'Remove oldest messages to fit within context limits';
    case 'hybrid':
      return 'Summarize older messages and truncate to fit within limits';
  }
}
