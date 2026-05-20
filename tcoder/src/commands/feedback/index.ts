import type { CommandDefinition } from '../../types/command.ts';

const feedback: CommandDefinition = {
  name: 'feedback',
  aliases: [],
  description: 'Send feedback about tcoder',
  usage: '/feedback <message>',
  async execute(ctx) {
    const { args } = ctx;
    const message = args.join(' ');

    if (!message) {
      return { success: false, message: 'Usage: /feedback <your feedback message>' };
    }

    return {
      success: true,
      message: `Feedback received. Thank you! Your feedback helps improve tcoder.\nFeedback: "${message}"`,
    };
  },
};

export default feedback;
