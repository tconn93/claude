import type { CommandDefinition } from '../../types/command.ts';

const tag: CommandDefinition = {
  name: 'tag',
  aliases: ['tags'],
  description: 'Add or remove tags on the current conversation',
  usage: '/tag [add <tag> | remove <tag> | list]',
  async execute(ctx) {
    const { args } = ctx;
    const tags = (ctx.state.config._conversationTags as string[]) ?? [];

    if (args.length === 0 || args[0] === 'list') {
      if (tags.length === 0) {
        return { success: true, message: 'No tags on current conversation.' };
      }
      return { success: true, message: `Tags: ${tags.join(', ')}` };
    }

    const sub = args[0].toLowerCase();

    if (sub === 'add') {
      const tagName = args[1];
      if (!tagName) {
        return { success: false, message: 'Usage: /tag add <tag-name>' };
      }
      if (tags.includes(tagName)) {
        return { success: false, message: `Tag already exists: ${tagName}` };
      }
      tags.push(tagName);
      ctx.state.config._conversationTags = tags;
      return { success: true, message: `Tag added: ${tagName}. Tags: ${tags.join(', ')}` };
    }

    if (sub === 'remove') {
      const tagName = args[1];
      if (!tagName) {
        return { success: false, message: 'Usage: /tag remove <tag-name>' };
      }
      const idx = tags.indexOf(tagName);
      if (idx === -1) {
        return { success: false, message: `Tag not found: ${tagName}` };
      }
      tags.splice(idx, 1);
      ctx.state.config._conversationTags = tags;
      return { success: true, message: `Tag removed: ${tagName}. Tags: ${tags.join(', ') || 'none'}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use add, remove, or list.` };
  },
};

export default tag;
