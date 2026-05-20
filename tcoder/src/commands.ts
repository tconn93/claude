import type { CommandDefinition, CommandRegistry, CommandContext, CommandResult } from './types/command.ts';
import type { AppState } from './state/types.ts';
import type { PermissionMode } from './types/permissions.ts';
import { getAppStateStore } from './state/store.ts';
import { APP_NAME, APP_VERSION } from './constants/common.ts';
import { listSessions, loadSession } from './history.ts';
import { getAppDataDir } from './utils/shell.ts';

class CommandRegistryImpl implements CommandRegistry {
  readonly commands: Map<string, CommandDefinition> = new Map();

  register(cmd: CommandDefinition): void {
    this.commands.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.commands.set(alias, cmd);
      }
    }
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(): CommandDefinition[] {
    const seen = new Set<string>();
    const unique: CommandDefinition[] = [];
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        unique.push(cmd);
      }
    }
    return unique;
  }

  find(name: string): CommandDefinition | undefined {
    const exact = this.commands.get(name);
    if (exact && exact.name === name) return exact;

    const lower = name.toLowerCase();
    for (const cmd of this.list()) {
      if (cmd.name.toLowerCase() === lower) return cmd;
      if (cmd.aliases?.some(a => a.toLowerCase() === lower)) return cmd;
    }
    return undefined;
  }

  async execute(name: string, ctx: CommandContext): Promise<CommandResult> {
    const cmd = this.find(name);
    if (!cmd) {
      return { success: false, message: `Unknown command: ${name}`, exitCode: 1 };
    }
    if (cmd.isEnabled) {
      const enabled = await cmd.isEnabled(ctx);
      if (!enabled) {
        return { success: false, message: `Command disabled: ${name}`, exitCode: 1 };
      }
    }
    return cmd.execute(ctx);
  }
}

let registryInstance: CommandRegistryImpl | null = null;

export function getCommandRegistry(): CommandRegistryImpl {
  if (!registryInstance) {
    registryInstance = new CommandRegistryImpl();
    registerAllCommands(registryInstance);
  }
  return registryInstance;
}

export function resetCommandRegistry(): void {
  registryInstance = null;
}

function registerAllCommands(registry: CommandRegistryImpl): void {
  registry.register(createHelpCommand());
  registry.register(createVersionCommand());
  registry.register(createClearCommand());
  registry.register(createModelCommand());
  registry.register(createPermissionCommand());
  registry.register(createConfigCommand());
  registry.register(createSessionsCommand());
  registry.register(createResumeCommand());
  registry.register(createResetCommand());
  registry.register(createContextCommand());
  registry.register(createThemeCommand());
  registry.register(createInitCommand());
  registry.register(createExitCommand());
}

function createStateFromStore(): AppState {
  return getAppStateStore().getState();
}

function createHelpCommand(): CommandDefinition {
  return {
    name: 'help',
    aliases: ['h', '?'],
    description: 'Show help information',
    usage: '/help [command]',
    args: [{ name: 'command', description: 'Command to get help for', required: false }],
    execute: async (ctx) => {
      const registry = getCommandRegistry();
      if (ctx.args.length > 0) {
        const cmd = registry.find(ctx.args[0]);
        if (!cmd) {
          return { success: false, message: `No help for: ${ctx.args[0]}` };
        }
        return {
          success: true,
          data: formatCommandHelp(cmd),
        };
      }
      return {
        success: true,
        data: formatAllCommandsHelp(registry),
      };
    },
  };
}

function createVersionCommand(): CommandDefinition {
  return {
    name: 'version',
    description: 'Show version information',
    execute: async () => ({
      success: true,
      data: `${APP_NAME} v${APP_VERSION}\nNode: ${process.version}\nPlatform: ${process.platform}-${process.arch}`,
    }),
  };
}

function createClearCommand(): CommandDefinition {
  return {
    name: 'clear',
    aliases: ['cls'],
    description: 'Clear the current conversation',
    execute: async () => {
      const store = getAppStateStore();
      store.setState({ messages: [] });
      return { success: true, message: 'Conversation cleared' };
    },
  };
}

function createModelCommand(): CommandDefinition {
  return {
    name: 'model',
    description: 'Show or change the current model',
    usage: '/model [model-name]',
    args: [{ name: 'model', description: 'Model name to switch to', required: false }],
    execute: async (ctx) => {
      const store = getAppStateStore();
      if (ctx.args.length > 0) {
        store.setState({ model: ctx.args[0] });
        return { success: true, message: `Model set to: ${ctx.args[0]}` };
      }
      return { success: true, data: store.getState().model };
    },
  };
}

function createPermissionCommand(): CommandDefinition {
  return {
    name: 'permissions',
    aliases: ['perm'],
    description: 'Show or change permission mode',
    usage: '/permissions [auto|acceptEdits|bypassPermissions|default|plan]',
    args: [{ name: 'mode', description: 'Permission mode', required: false }],
    execute: async (ctx) => {
      const store = getAppStateStore();
      if (ctx.args.length > 0) {
        const mode = ctx.args[0] as PermissionMode;
        const valid: PermissionMode[] = ['auto', 'acceptEdits', 'bypassPermissions', 'default', 'plan'];
        if (!valid.includes(mode)) {
          return { success: false, message: `Invalid mode: ${mode}. Valid: ${valid.join(', ')}` };
        }
        store.setState({ permissionMode: mode });
        return { success: true, message: `Permission mode set to: ${mode}` };
      }
      return { success: true, data: store.getState().permissionMode };
    },
  };
}

function createConfigCommand(): CommandDefinition {
  return {
    name: 'config',
    description: 'Show or modify configuration',
    usage: '/config [key] [value]',
    execute: async (ctx) => {
      const store = getAppStateStore();
      if (ctx.args.length === 0) {
        return { success: true, data: JSON.stringify(store.getState().config, null, 2) };
      }
      if (ctx.args.length === 1) {
        const val = store.getState().config[ctx.args[0]];
        return { success: true, data: `${ctx.args[0]}: ${JSON.stringify(val)}` };
      }
      const current = { ...store.getState().config };
      current[ctx.args[0]] = ctx.args[1];
      store.setState({ config: current });
      return { success: true, message: `Config set: ${ctx.args[0]} = ${ctx.args[1]}` };
    },
  };
}

function createSessionsCommand(): CommandDefinition {
  return {
    name: 'sessions',
    aliases: ['sess'],
    description: 'List recent sessions',
    execute: async () => {
      const sessions = listSessions({ limit: 20, sortBy: 'updatedAt', sortDir: 'desc' });
      if (sessions.length === 0) {
        return { success: true, message: 'No saved sessions' };
      }
      const lines = sessions.map((s, i) =>
        `[${i}] ${s.id} - "${s.title}" (${s.messageCount} msgs, ${s.model}) - ${new Date(s.updatedAt).toLocaleString()}`,
      );
      return { success: true, data: lines.join('\n') };
    },
  };
}

function createResumeCommand(): CommandDefinition {
  return {
    name: 'resume',
    description: 'Resume a previous session',
    usage: '/resume <session-id>',
    args: [{ name: 'sessionId', description: 'Session ID to resume', required: true }],
    execute: async (ctx) => {
      const conversation = loadSession(ctx.args[0]);
      if (!conversation) {
        return { success: false, message: `Session not found: ${ctx.args[0]}` };
      }
      const store = getAppStateStore();
      store.setState({
        sessionId: conversation.id,
        messages: conversation.messages,
        model: conversation.model,
        conversation,
      });
      return { success: true, message: `Resumed session: ${conversation.id} (${conversation.messages.length} messages)` };
    },
  };
}

function createResetCommand(): CommandDefinition {
  return {
    name: 'reset',
    description: 'Reset to a fresh session',
    execute: async () => {
      const store = getAppStateStore();
      const { AppStateManager } = await import('./state/AppState.ts');
      const fresh = AppStateManager.resetSession(store.getState());
      store.setState(fresh);
      return { success: true, message: 'Session reset' };
    },
  };
}

function createContextCommand(): CommandDefinition {
  return {
    name: 'context',
    aliases: ['ctx'],
    description: 'Show current context information',
    execute: async () => {
      const state = createStateFromStore();
      const info = {
        sessionId: state.sessionId,
        model: state.model,
        workingDirectory: state.workingDirectory,
        gitBranch: state.gitBranch,
        messageCount: state.messages.length,
        permissionMode: state.permissionMode,
        theme: state.theme,
      };
      return { success: true, data: JSON.stringify(info, null, 2) };
    },
  };
}

function createThemeCommand(): CommandDefinition {
  return {
    name: 'theme',
    description: 'Show or change the UI theme',
    usage: '/theme [dark|light|system]',
    args: [{ name: 'theme', description: 'Theme name', required: false }],
    execute: async (ctx) => {
      const store = getAppStateStore();
      if (ctx.args.length > 0) {
        const valid = ['dark', 'light', 'system'];
        if (!valid.includes(ctx.args[0])) {
          return { success: false, message: `Invalid theme. Valid: ${valid.join(', ')}` };
        }
        store.setState({ theme: ctx.args[0] });
        return { success: true, message: `Theme set to: ${ctx.args[0]}` };
      }
      return { success: true, data: store.getState().theme };
    },
  };
}

function createInitCommand(): CommandDefinition {
  return {
    name: 'init',
    description: 'Initialize tcoder in the current directory',
    execute: async () => {
      const dir = getAppDataDir();
      return { success: true, message: `tcoder data directory: ${dir}` };
    },
  };
}

function createExitCommand(): CommandDefinition {
  return {
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit tcoder',
    execute: async () => {
      return { success: true, exitCode: 0 };
    },
  };
}

function formatCommandHelp(cmd: CommandDefinition): string {
  const lines: string[] = [];
  lines.push(`Command: ${cmd.name}`);
  if (cmd.aliases && cmd.aliases.length > 0) {
    lines.push(`Aliases: ${cmd.aliases.join(', ')}`);
  }
  lines.push(`Description: ${cmd.description}`);
  if (cmd.usage) {
    lines.push(`Usage: ${cmd.usage}`);
  }
  if (cmd.args && cmd.args.length > 0) {
    lines.push('Arguments:');
    for (const arg of cmd.args) {
      const req = arg.required ? ' (required)' : '';
      lines.push(`  ${arg.name}: ${arg.description}${req}`);
    }
  }
  if (cmd.flags && cmd.flags.length > 0) {
    lines.push('Flags:');
    for (const flag of cmd.flags) {
      const short = flag.short ? `-${flag.short}, ` : '';
      lines.push(`  ${short}--${flag.name}: ${flag.description} [${flag.type}]`);
    }
  }
  return lines.join('\n');
}

function formatAllCommandsHelp(registry: CommandRegistryImpl): string {
  const lines: string[] = [];
  lines.push(`${APP_NAME} v${APP_VERSION} - Available Commands:`);
  lines.push('');

  for (const cmd of registry.list()) {
    const usage = cmd.usage ?? `/${cmd.name}`;
    lines.push(`  /${cmd.name.padEnd(16)} ${cmd.description}`);
  }

  lines.push('');
  lines.push('Type /help <command> for detailed help.');
  return lines.join('\n');
}
