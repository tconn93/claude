import type { CommandDefinition } from '../../types/command.ts';

interface MemoryEntry {
  content: string;
  category: string;
  timestamp: number;
}

const memory: CommandDefinition = {
  name: 'memory',
  aliases: ['mem'],
  description: 'View, add, or remove memory entries',
  usage: '/memory [add <content> | remove <index> | clear]',
  async execute(ctx) {
    const { args } = ctx;
    const memoryEntries = (ctx.state.config._memoryEntries as MemoryEntry[]) ?? [];

    if (args.length === 0) {
      if (memoryEntries.length === 0) {
        return { success: true, message: 'No memory entries stored.' };
      }
      const lines: string[] = ['Memory entries:', ''];
      for (let i = 0; i < memoryEntries.length; i++) {
        const entry = memoryEntries[i];
        const date = new Date(entry.timestamp).toLocaleString();
        lines.push(`  [${i}] ${entry.category} (${date})`);
        lines.push(`      ${entry.content}`);
      }
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'add') {
      const content = args.slice(1).join(' ');
      if (!content) {
        return { success: false, message: 'Usage: /memory add <content>' };
      }
      const entry: MemoryEntry = {
        content,
        category: 'manual',
        timestamp: Date.now(),
      };
      memoryEntries.push(entry);
      ctx.state.config._memoryEntries = memoryEntries;
      return { success: true, message: `Memory entry added at index ${memoryEntries.length - 1}.` };
    }

    if (sub === 'remove') {
      const idx = Number(args[1]);
      if (Number.isNaN(idx) || idx < 0 || idx >= memoryEntries.length) {
        return { success: false, message: `Invalid index: ${args[1]}. Valid range: 0-${memoryEntries.length - 1}` };
      }
      memoryEntries.splice(idx, 1);
      ctx.state.config._memoryEntries = memoryEntries;
      return { success: true, message: `Memory entry at index ${idx} removed.` };
    }

    if (sub === 'clear') {
      ctx.state.config._memoryEntries = [];
      return { success: true, message: 'All memory entries cleared.' };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use add, remove, or clear.` };
  },
};

export default memory;
