import type { CommandDefinition } from '../../types/command.ts';
import type { PermissionMode } from '../../types/permissions.ts';

const MODES: PermissionMode[] = ['default', 'auto', 'acceptEdits', 'bypassPermissions', 'dontAsk', 'plan'];

const permissions: CommandDefinition = {
  name: 'permissions',
  aliases: ['perms', 'perm'],
  description: 'Manage tool permissions',
  usage: '/permissions [mode | allow <tool> | deny <tool>]',
  async execute(ctx) {
    const { args } = ctx;
    const config = ctx.state.permissionConfig;

    if (args.length === 0) {
      const lines: string[] = [
        `Permission mode: ${ctx.state.permissionMode}`,
        `Default mode: ${config.defaultMode}`,
        '',
      ];

      if (config.rules.length > 0) {
        lines.push('Permission rules:');
        for (const rule of config.rules) {
          lines.push(`  ${rule.toolName}: ${rule.mode} (${rule.scope ?? 'session'})`);
        }
      } else {
        lines.push('No custom permission rules.');
      }

      if (config.denyList.length > 0) {
        lines.push('');
        lines.push('Denied tools:');
        for (const tool of config.denyList) {
          lines.push(`  ${tool}`);
        }
      }

      lines.push('');
      lines.push('Available modes: ' + MODES.join(', '));
      return { success: true, message: lines.join('\n') };
    }

    const sub = args[0].toLowerCase();

    if (MODES.includes(sub as PermissionMode)) {
      ctx.state.permissionMode = sub as PermissionMode;
      return { success: true, message: `Permission mode set to: ${sub}` };
    }

    if (sub === 'allow') {
      const toolName = args[1];
      if (!toolName) {
        return { success: false, message: 'Usage: /permissions allow <tool-name>' };
      }
      config.denyList = config.denyList.filter((t) => t !== toolName);
      config.rules.push({ toolName, mode: 'auto', scope: 'session' });
      return { success: true, message: `Allowed tool: ${toolName}` };
    }

    if (sub === 'deny') {
      const toolName = args[1];
      if (!toolName) {
        return { success: false, message: 'Usage: /permissions deny <tool-name>' };
      }
      if (!config.denyList.includes(toolName)) {
        config.denyList.push(toolName);
      }
      return { success: true, message: `Denied tool: ${toolName}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Use a mode name, allow, or deny.` };
  },
};

export default permissions;
