import type { CommandDefinition } from '../../types/command.ts';

const resume: CommandDefinition = {
  name: 'resume',
  aliases: [],
  description: 'Resume a previous session',
  usage: '/resume [session-id]',
  async execute(ctx) {
    const { args } = ctx;
    const sessions = (ctx.state.config._sessions as Array<{ id: string; title: string; timestamp: number }>) ?? [];

    if (args.length > 0) {
      const sessionId = args[0];
      const session = sessions.find((s) => s.id === sessionId || s.title.toLowerCase().includes(sessionId.toLowerCase()));
      if (!session) {
        return { success: false, message: `Session not found: ${sessionId}` };
      }
      ctx.state.sessionId = session.id;
      return { success: true, message: `Resumed session: ${session.id} - ${session.title}` };
    }

    if (sessions.length === 0) {
      return { success: true, message: 'No previous sessions to resume.' };
    }

    // Show most recent sessions
    const recent = sessions.slice(-5).reverse();
    const lines: string[] = ['Recent sessions (use /resume <id> to resume):', ''];
    for (const s of recent) {
      const date = new Date(s.timestamp).toLocaleString();
      lines.push(`  ${s.id} - ${s.title} (${date})`);
    }
    return { success: true, message: lines.join('\n') };
  },
};

export default resume;
