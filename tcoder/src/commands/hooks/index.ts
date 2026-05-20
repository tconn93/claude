import type { CommandDefinition } from '../../types/command.ts';
import type { HookDefinition } from '../../types/hooks.ts';

interface HookEntry {
  id: string;
  definition: HookDefinition;
  enabled: boolean;
}

const hooks: CommandDefinition = {
  name: 'hooks',
  aliases: ['hook'],
  description: 'List and manage hooks',
  usage: '/hooks [list | enable <id> | disable <id>]',
  async execute(ctx) {
    const { args } = ctx;
    const hookEntries = (ctx.state.config._hooks as HookEntry[]) ?? [];

    if (args.length === 0 || args[0] === 'list') {
      if (hookEntries.length === 0) {
        return { success: true, message: 'No hooks configured.' };
      }
      const lines: string[] = ['Configured hooks:', ''];
      for (const entry of hookEntries) {
        const status = entry.enabled ? '[enabled]' : '[disabled]';
        lines.push(`  ${entry.id} ${status}`);
        lines.push(`    type: ${entry.definition.type}, command: ${entry.definition.command}`);
        if (entry.definition.matcher) {
          lines.push(`    matcher: ${entry.definition.matcher}`);
        }
      }
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'enable') {
      const id = args[1];
      if (!id) return { success: false, message: 'Usage: /hooks enable <hook-id>' };
      const entry = hookEntries.find((e) => e.id === id);
      if (!entry) return { success: false, message: `Hook not found: ${id}` };
      entry.enabled = true;
      ctx.state.config._hooks = hookEntries;
      return { success: true, message: `Hook enabled: ${id}` };
    }

    if (sub === 'disable') {
      const id = args[1];
      if (!id) return { success: false, message: 'Usage: /hooks disable <hook-id>' };
      const entry = hookEntries.find((e) => e.id === id);
      if (!entry) return { success: false, message: `Hook not found: ${id}` };
      entry.enabled = false;
      ctx.state.config._hooks = hookEntries;
      return { success: true, message: `Hook disabled: ${id}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use list, enable, or disable.` };
  },
};

export default hooks;
