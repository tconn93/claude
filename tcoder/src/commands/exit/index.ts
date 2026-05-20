import type { CommandDefinition } from '../../types/command.ts';

const exit: CommandDefinition = {
  name: 'exit',
  aliases: ['quit', 'q'],
  description: 'Exit tcoder cleanly',
  usage: '/exit',
  async execute(ctx) {
    ctx.state.isActive = false;

    const msgCount = ctx.state.messages.length;
    const uptime = Math.floor((Date.now() - ctx.state.startTime) / 60000);

    return {
      success: true,
      message: `Goodbye. Session ended (${msgCount} messages, ${uptime}m uptime).`,
      exitCode: 0,
    };
  },
};

export default exit;
