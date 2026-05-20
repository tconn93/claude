import type { CommandDefinition } from '../../types/command.ts';

const review: CommandDefinition = {
  name: 'review',
  aliases: [],
  description: 'Request a code review of the current changes',
  usage: '/review [file-path]',
  async execute(ctx) {
    const { args } = ctx;
    const target = args.length > 0 ? args.join(' ') : 'current changes';

    return {
      success: true,
      message: `Code review requested for: ${target}. Review will be performed in the next response.`,
    };
  },
};

export default review;
