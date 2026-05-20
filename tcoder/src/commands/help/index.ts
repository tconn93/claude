import type { CommandDefinition } from '../../types/command.ts';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';

const help: CommandDefinition = {
  name: 'help',
  aliases: ['h', '?'],
  description: 'Show help information and available commands',
  usage: '/help [command]',
  async execute(ctx) {
    const { args } = ctx;
    if (args.length > 0) {
      const cmdName = args[0].toLowerCase();
      const registry = ctx.state.config._commandRegistry as
        | { find: (name: string) => CommandDefinition | undefined }
        | undefined;
      if (registry) {
        const cmd = registry.find(cmdName);
        if (cmd) {
          const lines: string[] = [
            `${cmd.name} - ${cmd.description}`,
          ];
          if (cmd.usage) {
            lines.push(`Usage: ${cmd.usage}`);
          }
          if (cmd.aliases && cmd.aliases.length > 0) {
            lines.push(`Aliases: ${cmd.aliases.join(', ')}`);
          }
          if (cmd.flags && cmd.flags.length > 0) {
            lines.push('Flags:');
            for (const flag of cmd.flags) {
              const short = flag.short ? `-${flag.short}, ` : '';
              lines.push(`  ${short}--${flag.name}: ${flag.description}`);
            }
          }
          if (cmd.args && cmd.args.length > 0) {
            lines.push('Arguments:');
            for (const arg of cmd.args) {
              const req = arg.required ? ' (required)' : '';
              lines.push(`  ${arg.name}: ${arg.description}${req}`);
            }
          }
          return { success: true, message: lines.join('\n') };
        }
      }
      return { success: false, message: `Unknown command: ${cmdName}` };
    }

    const registry = ctx.state.config._commandRegistry as
      | { list: () => CommandDefinition[] }
      | undefined;
    const lines: string[] = [
      `${APP_NAME} v${APP_VERSION}`,
      '',
      'Available commands:',
      '',
    ];

    if (registry) {
      const cmds = registry.list();
      const maxLen = Math.max(...cmds.map((c) => c.name.length));
      for (const cmd of cmds) {
        const padding = ' '.repeat(maxLen - cmd.name.length + 2);
        lines.push(`  ${cmd.name}${padding}${cmd.description}`);
      }
    }

    lines.push('');
    lines.push('Type /help <command> for detailed help on a specific command.');

    return { success: true, message: lines.join('\n') };
  },
};

export default help;
