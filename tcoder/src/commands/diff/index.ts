import type { CommandDefinition } from '../../types/command.ts';

const diff: CommandDefinition = {
  name: 'diff',
  aliases: ['diffs'],
  description: 'Show diffs for conversation or file changes',
  usage: '/diff [file-path]',
  async execute(ctx) {
    const { args } = ctx;

    if (args.length > 0) {
      const target = args.join(' ');
      return {
        success: true,
        message: `Diff requested for: ${target}. The assistant will show the diff in the next response.`,
      };
    }

    const msgCount = ctx.state.messages.length;
    const assistantCount = ctx.state.messages.filter((m) => m.type === 'assistant').length;
    const userCount = ctx.state.messages.filter((m) => m.type === 'user').length;

    return {
      success: true,
      message: `Conversation summary: ${msgCount} total messages (${userCount} user, ${assistantCount} assistant). Use /diff <file> to diff file changes.`,
    };
  },
};

export default diff;
