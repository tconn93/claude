export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length * 0.25);
}

export function estimateTokensPrecise(text: string): number {
  if (!text) return 0;

  let count = 0;
  const words = text.split(/\s+/);
  const averageCharsPerToken = 4;

  for (const word of words) {
    count += Math.ceil(word.length / averageCharsPerToken);
  }

  return Math.max(1, count);
}

export function estimateJSONTokens(obj: unknown): number {
  try {
    const str = JSON.stringify(obj);
    return estimateTokenCount(str);
  } catch {
    return 0;
  }
}

export function estimateBlockTokens(block: { type: string; [key: string]: unknown }): number {
  switch (block.type) {
    case 'text':
      return estimateTokenCount((block.text as string) ?? '');
    case 'tool_use': {
      const name = (block.name as string) ?? '';
      const input = block.input ?? {};
      return estimateTokenCount(name) + estimateJSONTokens(input) + 10;
    }
    case 'tool_result': {
      const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '');
      return estimateTokenCount(content) + 5;
    }
    case 'thinking':
      return estimateTokenCount((block.thinking as string) ?? '');
    case 'image':
      return 100;
    default:
      return 50;
  }
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
  modelId = 'grok-4.3',
): number {
  const rates: Record<string, { input: number; output: number; cacheCreate: number; cacheRead: number }> = {
    'grok-4.3': { input: 5.0, output: 15.0, cacheCreate: 0, cacheRead: 0 },
    'grok-4.3': { input: 2.0, output: 8.0, cacheCreate: 0, cacheRead: 0 },
    'grok-4': { input: 0.5, output: 2.0, cacheCreate: 0, cacheRead: 0 },
  };

  const rate = rates[modelId] ?? rates['grok-4.3'];

  const inputCost = (inputTokens / 1_000_000) * rate.input;
  const outputCost = (outputTokens / 1_000_000) * rate.output;
  const cacheCreateCost = (cacheCreationTokens / 1_000_000) * rate.cacheCreate;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * rate.cacheRead;

  return inputCost + outputCost + cacheCreateCost + cacheReadCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `${(cost * 100).toFixed(3)}c`;
  }
  return `$${cost.toFixed(2)}`;
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  if (estimatedTokens <= maxTokens) return text;

  const ratio = maxTokens / estimatedTokens;
  const targetChars = Math.floor(text.length * ratio * 0.9);

  return text.slice(0, targetChars) + '\n...[truncated]';
}
