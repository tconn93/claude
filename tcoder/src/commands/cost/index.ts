import type { CommandDefinition } from '../../types/command.ts';
import type { AssistantMessage } from '../../types/message.ts';

const cost: CommandDefinition = {
  name: 'cost',
  aliases: ['tokens', 'usage'],
  description: 'Display token usage and estimated cost',
  usage: '/cost',
  async execute(ctx) {
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheCreation = 0;
    let totalCacheRead = 0;

    for (const msg of ctx.state.messages) {
      if (msg.type === 'assistant') {
        const am = msg as AssistantMessage;
        if (am.usage) {
          totalInput += am.usage.inputTokens;
          totalOutput += am.usage.outputTokens;
          totalCacheCreation += am.usage.cacheCreationInputTokens ?? 0;
          totalCacheRead += am.usage.cacheReadInputTokens ?? 0;
        }
      }
    }

    if (totalInput === 0 && totalOutput === 0) {
      return { success: true, message: 'No token usage recorded yet.' };
    }

    const total = totalInput + totalOutput + totalCacheCreation + totalCacheRead;

    const inputCost = (totalInput / 1_000_000) * 3.0;
    const outputCost = (totalOutput / 1_000_000) * 15.0;
    const cacheCreationCost = (totalCacheCreation / 1_000_000) * 3.75;
    const cacheReadCost = (totalCacheRead / 1_000_000) * 0.3;
    const estimatedCost = inputCost + outputCost + cacheCreationCost + cacheReadCost;

    const lines: string[] = [
      'Token Usage:',
      '',
      `  Input tokens:          ${totalInput.toLocaleString()}`,
      `  Output tokens:         ${totalOutput.toLocaleString()}`,
      `  Cache creation tokens: ${totalCacheCreation.toLocaleString()}`,
      `  Cache read tokens:     ${totalCacheRead.toLocaleString()}`,
      `  Total tokens:          ${total.toLocaleString()}`,
      '',
      `  Estimated cost: $${estimatedCost.toFixed(4)}`,
    ];

    return { success: true, message: lines.join('\n') };
  },
};

export default cost;
