import type { CommandDefinition } from '../../types/command.ts';

const logout: CommandDefinition = {
  name: 'logout',
  aliases: [],
  description: 'Clear authentication credentials',
  usage: '/logout',
  async execute(ctx) {
    ctx.state.config._authenticated = false;
    ctx.state.config._apiKey = undefined;
    return { success: true, message: 'Logged out. Authentication credentials cleared.' };
  },
};

export default logout;
