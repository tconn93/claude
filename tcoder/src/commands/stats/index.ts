import type { CommandDefinition } from '../../types/command.ts';
import type { AssistantMessage } from '../../types/message.ts';

const stats: CommandDefinition = {
  name: 'stats',
  aliases: ['statistics'],
  description: 'Show usage statistics',
  usage: '/stats',
  async execute(ctx) {
    const { state } = ctx;
    let totalInput = 0;
    let totalOutput = 0;
    let toolCalls = 0;

    for (const msg of state.messages) {
      if (msg.type === 'assistant') {
        const am = msg as AssistantMessage;
        if (am.usage) {
          totalInput += am.usage.inputTokens;
          totalOutput += am.usage.outputTokens;
        }
        if (am.content) {
          for (const block of am.content) {
            if (block.type === 'tool_use') toolCalls++;
          }
        }
      }
    }

    const uptime = Date.now() - state.startTime;
    const uptimeMin = Math.floor(uptime / 60000);

    const lines: string[] = [
      'Usage Statistics:',
      '',
      `  Session uptime:        ${uptimeMin}m`,
      `  Total messages:        ${state.messages.length}`,
      `  Total input tokens:    ${totalInput.toLocaleString()}`,
      `  Total output tokens:   ${totalOutput.toLocaleString()}`,
      `  Total tokens:          ${(totalInput + totalOutput).toLocaleString()}`,
      `  Tool calls:            ${toolCalls}`,
      `  Active tools:          ${state.activeTools.size}`,
      `  Input history size:    ${state.inputHistory.length}`,
    ];

    return { success: true, message: lines.join('\n') };
  },
};

export default stats;
