import type { CommandDefinition } from '../../types/command.ts';

interface MCPServerEntry {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
}

const mcp: CommandDefinition = {
  name: 'mcp',
  aliases: [],
  description: 'Manage MCP servers',
  usage: '/mcp [list | status]',
  async execute(ctx) {
    const servers = (ctx.state.config._mcpServers as MCPServerEntry[]) ?? [];

    if (servers.length === 0) {
      return { success: true, message: 'No MCP servers configured. Add servers in settings to use MCP tools.' };
    }

    const lines: string[] = ['MCP Servers:', ''];
    for (const srv of servers) {
      const status = srv.enabled ? '[enabled]' : '[disabled]';
      lines.push(`  ${srv.name} ${status}`);
      lines.push(`    command: ${srv.command} ${srv.args.join(' ')}`);
    }

    return { success: true, message: lines.join('\n') };
  },
};

export default mcp;
