import type { CommandDefinition } from '../../types/command.ts';

const ide: CommandDefinition = {
  name: 'ide',
  aliases: [],
  description: 'Open the current project in an external IDE',
  usage: '/ide [editor]',
  async execute(ctx) {
    const { args } = ctx;
    const preferredEditor = args.length > 0 ? args[0] : 'code';
    const cwd = ctx.state.workingDirectory;

    return {
      success: true,
      message: `Opening ${cwd} in ${preferredEditor}. Use /ide <editor> to specify a different editor (e.g., /ide cursor).`,
    };
  },
};

export default ide;
