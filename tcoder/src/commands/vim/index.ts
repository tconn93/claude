import type { CommandDefinition } from '../../types/command.ts';

const vim: CommandDefinition = {
  name: 'vim',
  aliases: [],
  description: 'Toggle vim-style keybindings for text input',
  usage: '/vim [on | off]',
  async execute(ctx) {
    const { args } = ctx;
    const current = (ctx.state.config._vimMode as boolean) ?? false;

    if (args.length === 0) {
      const next = !current;
      ctx.state.config._vimMode = next;
      return { success: true, message: `Vim mode: ${next ? 'on' : 'off'}` };
    }

    const sub = args[0].toLowerCase();
    if (sub === 'on' || sub === 'enable') {
      ctx.state.config._vimMode = true;
      return { success: true, message: 'Vim mode enabled.' };
    }
    if (sub === 'off' || sub === 'disable') {
      ctx.state.config._vimMode = false;
      return { success: true, message: 'Vim mode disabled.' };
    }

    return { success: false, message: 'Usage: /vim [on | off]' };
  },
};

export default vim;
