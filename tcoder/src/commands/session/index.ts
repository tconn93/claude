import type { CommandDefinition } from '../../types/command.ts';

const session: CommandDefinition = {
  name: 'session',
  aliases: ['sess'],
  description: 'Manage sessions',
  usage: '/session [list | new | switch <id>]',
  async execute(ctx) {
    const { args } = ctx;
    const sessions = (ctx.state.config._sessions as Array<{ id: string; title: string; timestamp: number }>) ?? [];

    if (args.length === 0 || args[0] === 'list') {
      if (sessions.length === 0) {
        return { success: true, message: 'No saved sessions.' };
      }
      const lines: string[] = ['Sessions:', ''];
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const date = new Date(s.timestamp).toLocaleString();
        const active = s.id === ctx.state.sessionId ? ' [active]' : '';
        lines.push(`  ${i}) ${s.id}${active} - ${s.title} (${date})`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'new') {
      const title = args.slice(1).join(' ') || 'Untitled session';
      const newSession = {
        id: `session-${Date.now()}`,
        title,
        timestamp: Date.now(),
      };
      sessions.push(newSession);
      ctx.state.config._sessions = sessions;
      return { success: true, message: `Created new session: ${newSession.id}` };
    }

    if (sub === 'switch') {
      const sessionId = args[1];
      if (!sessionId) {
        return { success: false, message: 'Usage: /session switch <session-id>' };
      }
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        return { success: false, message: `Session not found: ${sessionId}` };
      }
      ctx.state.sessionId = session.id;
      return { success: true, message: `Switched to session: ${session.id} - ${session.title}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use list, new, or switch.` };
  },
};

export default session;
