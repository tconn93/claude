import type { CommandDefinition } from '../../types/command.ts';

const plan: CommandDefinition = {
  name: 'plan',
  aliases: [],
  description: 'Enter plan mode for strategic thinking before executing',
  usage: '/plan [topic]',
  async execute(ctx) {
    ctx.state.permissionMode = 'plan';
    const topic = ctx.args.join(' ') || 'general task';

    return {
      success: true,
      message: `Plan mode activated. The assistant will now think through "${topic}" strategically before taking action. Use /permissions default to exit plan mode.`,
    };
  },
};

export default plan;
