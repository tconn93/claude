import type { CommandDefinition } from '../../types/command.ts';

const status: CommandDefinition = {
  name: 'status',
  aliases: ['st', 'info'],
  description: 'Display current session status',
  usage: '/status',
  async execute(ctx) {
    const { state } = ctx;
    const uptime = Date.now() - state.startTime;
    const uptimeMin = Math.floor(uptime / 60000);
    const uptimeSec = Math.floor((uptime % 60000) / 1000);
    const uptimeStr = uptime > 3600000
      ? `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`
      : `${uptimeMin}m ${uptimeSec}s`;

    const lines: string[] = [
      'Session Status:',
      '',
      `  Session ID:       ${state.sessionId}`,
      `  Active:           ${state.isActive ? 'yes' : 'no'}`,
      `  Uptime:           ${uptimeStr}`,
      `  Model:            ${state.model}`,
      `  Fast mode:        ${state.fastMode ? 'on' : 'off'}`,
      `  Permission mode:  ${state.permissionMode}`,
      `  Theme:            ${state.theme}`,
      `  Messages:         ${state.messages.length}`,
      `  Active tools:     ${state.activeTools.size}`,
      `  Working dir:      ${state.workingDirectory}`,
      `  Git branch:       ${state.gitBranch ?? 'none'}`,
    ];

    return { success: true, message: lines.join('\n') };
  },
};

export default status;
