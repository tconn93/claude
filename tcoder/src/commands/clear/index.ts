import type { CommandDefinition } from '../../types/command.ts';

const clear: CommandDefinition = {
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear the conversation history',
  usage: '/clear',
  async execute(ctx) {
    ctx.state.messages.length = 0;
    ctx.state.conversation = null;
    return { success: true, message: 'Conversation cleared.' };
  },
};

export default clear;
