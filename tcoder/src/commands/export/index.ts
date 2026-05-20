import type { CommandDefinition } from '../../types/command.ts';

const exportCommand: CommandDefinition = {
  name: 'export',
  aliases: ['save'],
  description: 'Export conversation to a file',
  usage: '/export [file-path]',
  async execute(ctx) {
    const { args } = ctx;

    if (ctx.state.messages.length === 0) {
      return { success: false, message: 'No messages to export.' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = `tcoder-export-${timestamp}.json`;
    const filePath = args.length > 0 ? args.join(' ') : defaultPath;

    const exportData = {
      sessionId: ctx.state.sessionId,
      exportedAt: new Date().toISOString(),
      model: ctx.state.model,
      messageCount: ctx.state.messages.length,
      messages: ctx.state.messages.map((msg) => ({
        type: msg.type,
        role: msg.role,
        content: msg.content,
        timestamp: 'timestamp' in msg ? msg.timestamp : undefined,
      })),
    };

    return {
      success: true,
      message: `Export ready. ${exportData.messageCount} messages will be written to: ${filePath}`,
      data: exportData,
    };
  },
};

export default exportCommand;
