import type { CommandDefinition } from '../../types/command.ts';

const login: CommandDefinition = {
  name: 'login',
  aliases: ['auth'],
  description: 'Login to xAI',
  usage: '/login',
  async execute(ctx) {
    if (ctx.state.config._authenticated) {
      return { success: true, message: 'Already authenticated.' };
    }

    return {
      success: true,
      message: 'To authenticate, set XAI_API_KEY in your environment.\n\nGet your API key at https://console.x.ai/',
    };
  },
};

export default login;
