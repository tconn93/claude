import type { CommandDefinition } from '../../types/command.ts';
import { COMPACT_THRESHOLD } from '../../constants/common.ts';

const compact: CommandDefinition = {
  name: 'compact',
  aliases: ['squeeze'],
  description: 'Manually trigger conversation compaction',
  usage: '/compact',
  async execute(ctx) {
    const msgCount = ctx.state.messages.length;

    if (msgCount < COMPACT_THRESHOLD) {
      return {
        success: true,
        message: `No compaction needed. ${msgCount} messages (threshold: ${COMPACT_THRESHOLD}).`,
      };
    }

    const excessStart = Math.max(0, msgCount - COMPACT_THRESHOLD);
    const removed = ctx.state.messages.splice(0, excessStart);

    ctx.state.messages.unshift({
      type: 'system',
      role: 'system',
      content: `[Compacted: ${removed.length} messages removed to stay within context limits]`,
      subtype: 'compact',
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `Compacted ${removed.length} messages. Current message count: ${ctx.state.messages.length}.`,
    };
  },
};

export default compact;
