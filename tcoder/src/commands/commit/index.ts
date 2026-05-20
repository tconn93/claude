import type { CommandDefinition } from '../../types/command.ts';

const commit: CommandDefinition = {
  name: 'commit',
  aliases: ['ci'],
  description: 'Generate a commit message and stage changes for commit',
  usage: '/commit [message]',
  async execute(ctx) {
    const { args } = ctx;
    const message = args.join(' ');

    if (message) {
      return {
        success: true,
        message: `Commit message set: "${message}". The assistant will commit with this message in the next response.`,
      };
    }

    return {
      success: true,
      message: 'Generating commit message based on current changes. The assistant will propose a commit message in the next response.',
    };
  },
};

export default commit;
