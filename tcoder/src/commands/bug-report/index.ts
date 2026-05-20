import type { CommandDefinition } from '../../types/command.ts';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';
import { platform, arch } from 'node:os';

const bugReport: CommandDefinition = {
  name: 'bug-report',
  aliases: ['bug'],
  description: 'File a bug report',
  usage: '/bug-report <description>',
  async execute(ctx) {
    const { args } = ctx;
    const description = args.join(' ');

    if (!description) {
      return { success: false, message: 'Usage: /bug-report <description of the bug>' };
    }

    const report = {
      app: `${APP_NAME} v${APP_VERSION}`,
      platform: `${platform()} ${arch()}`,
      model: ctx.state.model,
      sessionId: ctx.state.sessionId,
      messageCount: ctx.state.messages.length,
      description,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      message: [
        'Bug report generated. Please include this information when reporting:',
        '',
        `  App:       ${report.app}`,
        `  Platform:  ${report.platform}`,
        `  Model:     ${report.model}`,
        `  Session:   ${report.sessionId}`,
        `  Messages:  ${report.messageCount}`,
        '',
        `  Description: ${description}`,
      ].join('\n'),
      data: report,
    };
  },
};

export default bugReport;
