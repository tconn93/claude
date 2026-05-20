import type { Message, ContentBlock, TokenUsage } from '../../types/message.ts';
import { estimateTokenCount } from './tokenCount.ts';
import { COMPACT_THRESHOLD, MAX_CONVERSATION_MESSAGES } from '../../constants/common.ts';

export interface ContextWindowInfo {
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  isFull: boolean;
  usagePercent: number;
}

export interface CompactStrategy {
  shouldCompact: boolean;
  reason: string;
  messagesToRemove: number;
}

export function getContextWindowInfo(
  messages: Message[],
  maxTokens: number,
  pendingInput?: string,
): ContextWindowInfo {
  const usedTokens = estimateContextTokens(messages, pendingInput);
  const remainingTokens = maxTokens - usedTokens;

  return {
    maxTokens,
    usedTokens,
    remainingTokens,
    isFull: remainingTokens < 1024,
    usagePercent: Math.round((usedTokens / maxTokens) * 100),
  };
}

export function estimateContextTokens(messages: Message[], pendingInput?: string): number {
  let total = 0;

  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }

  if (pendingInput) {
    total += estimateTokenCount(pendingInput);
  }

  total += 200;

  return total;
}

function estimateMessageTokens(msg: Message): number {
  let count = 4;

  if (typeof msg.content === 'string') {
    count += estimateTokenCount(msg.content);
  } else if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      count += estimateBlockTokens(block);
    }
  }

  if ('usage' in msg && msg.usage) {
    count += (msg.usage as TokenUsage).inputTokens ?? 0;
    count += (msg.usage as TokenUsage).outputTokens ?? 0;
  }

  return count;
}

function estimateBlockTokens(block: ContentBlock): number {
  switch (block.type) {
    case 'text':
      return estimateTokenCount(block.text ?? '');
    case 'tool_use':
      return estimateTokenCount(JSON.stringify(block.input ?? {})) + 10;
    case 'tool_result':
      return estimateTokenCount(typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '')) + 5;
    default:
      return 50;
  }
}

export function shouldCompact(
  messages: Message[],
  maxTokens: number,
  threshold?: number,
): CompactStrategy {
  const t = threshold ?? COMPACT_THRESHOLD;

  if (messages.length > MAX_CONVERSATION_MESSAGES) {
    const toRemove = messages.length - t;
    return { shouldCompact: true, reason: `Too many messages (${messages.length} > ${MAX_CONVERSATION_MESSAGES})`, messagesToRemove: toRemove };
  }

  const info = getContextWindowInfo(messages, maxTokens);

  if (info.usagePercent > 80) {
    const excessTokens = info.usedTokens - (maxTokens * 0.7);
    const estimatedMessagesToRemove = Math.ceil(excessTokens / 500);
    return {
      shouldCompact: true,
      reason: `Context window ${info.usagePercent}% full (${info.usedTokens}/${info.maxTokens} tokens)`,
      messagesToRemove: Math.max(2, estimatedMessagesToRemove),
    };
  }

  return { shouldCompact: false, reason: 'Context window has sufficient space', messagesToRemove: 0 };
}

export function selectMessagesToCompact(messages: Message[]): { keep: Message[]; remove: Message[] } {
  const keep: Message[] = [];
  const remove: Message[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.type === 'system') {
      keep.push(msg);
      continue;
    }

    const isRecent = i >= messages.length - 10;
    const isImportant = msg.type === 'user' || (msg.type === 'assistant' && hasToolCalls(msg));

    if (isRecent || isImportant) {
      keep.push(msg);
    } else {
      remove.push(msg);
    }
  }

  return { keep, remove };
}

function hasToolCalls(msg: Message): boolean {
  if (msg.type !== 'assistant') return false;

  const content = msg.content;
  if (!Array.isArray(content)) return false;

  return content.some(block => {
    if (typeof block === 'object' && block !== null && 'type' in block) {
      return block.type === 'tool_use';
    }
    return false;
  });
}

export function createCompactSummary(removedMessages: Message[]): string {
  const userMsgs = removedMessages.filter(m => m.type === 'user');
  const assistantMsgs = removedMessages.filter(m => m.type === 'assistant');
  const toolMsgs = removedMessages.filter(m =>
    m.type === 'assistant' && Array.isArray(m.content) &&
    m.content.some(b => typeof b === 'object' && b !== null && 'type' in b && (b.type === 'tool_use' || b.type === 'tool_result'))
  );

  const summary: string[] = [];

  if (userMsgs.length > 0) {
    summary.push(`${userMsgs.length} user messages`);
  }

  if (assistantMsgs.length > 0) {
    summary.push(`${assistantMsgs.length} assistant messages`);
  }

  if (toolMsgs.length > 0) {
    summary.push(`${toolMsgs.length} messages with tool calls`);
  }

  return `[Compacted ${removedMessages.length} messages: ${summary.join(', ')}]`;
}
