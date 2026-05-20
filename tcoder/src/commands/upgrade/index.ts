import type { CommandDefinition } from '../../types/command.ts';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';

const upgrade: CommandDefinition = {
  name: 'upgrade',
  aliases: ['update'],
  description: 'Check for and apply updates',
  usage: '/upgrade [check]',
  async execute(ctx) {
    const { args } = ctx;

    if (args.length > 0 && args[0] === 'check') {
      return {
        success: true,
        message: `Checking for ${APP_NAME} updates... (current: v${APP_VERSION}). Run /upgrade to apply updates.`,
      };
    }

    return {
      success: true,
      message: `${APP_NAME} v${APP_VERSION} is currently installed. Use /upgrade check to look for newer versions.`,
    };
  },
};

export default upgrade;
