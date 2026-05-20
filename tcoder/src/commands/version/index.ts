import type { CommandDefinition } from '../../types/command.ts';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';
import { version as nodeVersion, platform, arch } from 'node:os';

const version: CommandDefinition = {
  name: 'version',
  aliases: ['ver', 'v'],
  description: 'Display version information',
  usage: '/version',
  async execute(ctx) {
    const lines: string[] = [
      `${APP_NAME} v${APP_VERSION}`,
      `Node.js ${nodeVersion()}`,
      `Platform: ${platform()} ${arch()}`,
      `Model: ${ctx.state.model}`,
    ];
    return { success: true, message: lines.join('\n') };
  },
};

export default version;
