import type { Message, TokenUsage } from '../types/message.ts';
import type { ToolDefinition, ToolInputSchema } from '../types/tool.ts';

export interface TokenEstimate {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  breakdown: {
    messages: number;
    systemPrompt: number;
    tools: number;
    thinking: number;
    overhead: number;
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    switch (msg.type) {
      case 'system':
        total += estimateTokens(msg.content);
        break;
      case 'user':
        total += estimateTokens(
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        );
        break;
      case 'assistant':
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && 'text' in block) {
              total += estimateTokens(block.text);
            } else if (block.type === 'thinking' && 'thinking' in block) {
              total += estimateTokens(block.thinking);
            } else if (block.type === 'tool_use') {
              total += estimateTokens(JSON.stringify(block.input ?? {}));
            } else {
              total += estimateTokens(JSON.stringify(block));
            }
          }
        } else {
          total += estimateTokens(String(msg.content));
        }
        break;
      default:
        total += estimateTokens(JSON.stringify(msg));
    }
  }
  return total;
}

export function estimateToolsTokens(tools: ToolDefinition[]): number {
  let total = 0;
  for (const tool of tools) {
    total += estimateTokens(tool.description);
    total += estimateTokens(tool.name);
    total += estimateTokens(JSON.stringify(tool.inputSchema));
    if (tool.prompt) {
      total += estimateTokens(tool.prompt);
    }
  }
  return total;
}

export function estimateSystemPromptTokens(systemPrompt: string): number {
  return estimateTokens(systemPrompt);
}

export function getFullTokenEstimate(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  thinkingBudget = 0,
): TokenEstimate {
  const messagesTokens = estimateMessagesTokens(messages);
  const systemTokens = estimateSystemPromptTokens(systemPrompt);
  const toolsTokens = estimateToolsTokens(tools);
  const overheadTokens = 200; // API overhead

  const inputTokens = messagesTokens + systemTokens + toolsTokens + overheadTokens;
  const outputTokens = Math.ceil((messagesTokens + toolsTokens) * 0.3) + thinkingBudget;
  const totalTokens = inputTokens + outputTokens;

  return {
    totalTokens,
    inputTokens,
    outputTokens,
    breakdown: {
      messages: messagesTokens,
      systemPrompt: systemTokens,
      tools: toolsTokens,
      thinking: thinkingBudget,
      overhead: overheadTokens,
    },
  };
}

export function estimateRequestTokens(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
): number {
  const estimate = getFullTokenEstimate(messages, systemPrompt, tools);
  return estimate.inputTokens;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePer1M: number,
  outputPricePer1M: number,
): number {
  return (
    (inputTokens / 1_000_000) * inputPricePer1M +
    (outputTokens / 1_000_000) * outputPricePer1M
  );
}

export function estimateConversationCost(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  inputPricePer1M: number,
  outputPricePer1M: number,
): number {
  const inputTokens = estimateMessagesTokens(messages) + estimateSystemPromptTokens(systemPrompt) + estimateToolsTokens(tools);
  const outputTokens = Math.ceil(inputTokens * 0.3);
  return estimateCost(inputTokens, outputTokens, inputPricePer1M, outputPricePer1M);
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

export function estimateContextUsage(
  messages: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  contextWindow: number,
): {
  usedTokens: number;
  availableTokens: number;
  usagePercent: number;
  isNearLimit: boolean;
} {
  const usedTokens = estimateRequestTokens(messages, systemPrompt, tools);
  const availableTokens = contextWindow - usedTokens;
  const usagePercent = (usedTokens / contextWindow) * 100;

  return {
    usedTokens,
    availableTokens,
    usagePercent,
    isNearLimit: usagePercent > 80,
  };
}
