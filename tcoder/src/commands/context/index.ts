import type { CommandDefinition } from '../../types/command.ts';

const context: CommandDefinition = {
  name: 'context',
  aliases: ['ctx'],
  description: 'Display current context information',
  usage: '/context',
  async execute(ctx) {
    const { state } = ctx;
    const lines: string[] = [
      'Current Context:',
      '',
      `  Session ID:        ${state.sessionId}`,
      `  Working Directory: ${state.workingDirectory}`,
      `  Git Branch:        ${state.gitBranch ?? 'none'}`,
      `  Git Status:        ${state.gitStatus ?? 'clean'}`,
      `  Model:             ${state.model}`,
      `  Permission Mode:   ${state.permissionMode}`,
      `  Theme:             ${state.theme}`,
      `  Fast Mode:         ${state.fastMode ? 'on' : 'off'}`,
      `  Messages:          ${state.messages.length}`,
      `  Active Tools:      ${state.activeTools.size}`,
    ];

    return { success: true, message: lines.join('\n') };
  },
};

export default context;
