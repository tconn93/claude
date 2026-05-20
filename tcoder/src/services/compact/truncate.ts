import type { Message } from '../../types/message.ts';

export interface TruncateOptions {
  maxMessages?: number;
  preserveSystem?: boolean;
  preserveRecent?: number;
  preserveFirst?: number;
}

export function truncateMessages(messages: Message[], maxMessages: number, options: TruncateOptions = {}): Message[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const preserveFirst = options.preserveFirst ?? 2;
  const preserveRecent = options.preserveRecent ?? 10;
  const preserveSystem = options.preserveSystem ?? true;

  const systemMessages = preserveSystem
    ? messages.filter((m) => m.type === 'system')
    : [];

  const nonSystemMessages = messages.filter((m) => m.type !== 'system');

  if (systemMessages.length + preserveFirst + preserveRecent >= maxMessages) {
    // Not enough room for all preserved messages
    return [
      ...systemMessages.slice(0, Math.min(systemMessages.length, maxMessages - preserveRecent)),
      ...nonSystemMessages.slice(-preserveRecent),
    ];
  }

  const firstMessages = nonSystemMessages.slice(0, preserveFirst);
  const recentMessages = nonSystemMessages.slice(-preserveRecent);

  const remainingSlots = maxMessages - systemMessages.length - firstMessages.length - recentMessages.length;
  let middleStart = preserveFirst;
  let middleEnd = nonSystemMessages.length - preserveRecent;

  // If middle doesn't have enough messages, expand recent or first
  if (middleEnd <= middleStart || remainingSlots <= 0) {
    const available = maxMessages - systemMessages.length;
    if (available <= recentMessages.length) {
      return [...systemMessages, ...nonSystemMessages.slice(-available)];
    }
    return [...systemMessages, ...nonSystemMessages.slice(0, Math.min(preserveFirst, available - recentMessages.length)), ...recentMessages.slice(0, available)];
  }

  const middleMessages = nonSystemMessages.slice(middleStart, middleEnd);

  if (middleMessages.length <= remainingSlots) {
    return [...systemMessages, ...firstMessages, ...middleMessages, ...recentMessages];
  }

  // Take evenly-spaced sample from middle
  const step = Math.max(1, Math.floor(middleMessages.length / remainingSlots));
  const sampled: Message[] = [];
  for (let i = 0; i < middleMessages.length && sampled.length < remainingSlots; i += step) {
    sampled.push(middleMessages[i]);
    if (sampled.length >= remainingSlots && i + step < middleMessages.length) {
      // Add one more if we haven't filled slots
      continue;
    }
  }

  // Ensure exact count
  const result = [...systemMessages, ...firstMessages, ...sampled, ...recentMessages];
  if (result.length > maxMessages) {
    return result.slice(0, maxMessages);
  }

  return result;
}

export function truncateByTokens(messages: Message[], maxTokens: number): Message[] {
  let tokenCount = 0;
  const result: Message[] = [];

  // Process in reverse to keep most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const estimatedTokens = estimateMessageTokens(msg);

    if (tokenCount + estimatedTokens <= maxTokens) {
      tokenCount += estimatedTokens;
      result.unshift(msg);
    } else {
      break;
    }
  }

  return result;
}

function estimateMessageTokens(message: Message): number {
  const content = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content);
  return Math.ceil(content.length / 4);
}

export function estimateTotalTokens(messages: Message[]): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

export function countToolUseMessages(messages: Message[]): number {
  return messages.filter((m) => {
    if (m.type === 'assistant' && Array.isArray(m.content)) {
      return m.content.some((block) =>
        block.type === 'tool_use' && 'name' in block,
      );
    }
    return false;
  }).length;
}

export function countToolResultMessages(messages: Message[]): number {
  return messages.filter((m) => {
    if (m.type === 'user' && Array.isArray(m.content)) {
      return m.content.some((block) => block.type === 'tool_result');
    }
    return false;
  }).length;
}
