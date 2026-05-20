import type {
  CommandRegistry,
  CommandDefinition,
  CommandContext,
  CommandResult,
} from '../types/command.ts';

import help from './help/index.ts';
import clear from './clear/index.ts';
import config from './config/index.ts';
import context from './context/index.ts';
import cost from './cost/index.ts';
import doctor from './doctor/index.ts';
import memory from './memory/index.ts';
import model from './model/index.ts';
import permissions from './permissions/index.ts';
import plan from './plan/index.ts';
import review from './review/index.ts';
import status from './status/index.ts';
import compact from './compact/index.ts';
import hooks from './hooks/index.ts';
import mcp from './mcp/index.ts';
import skills from './skills/index.ts';
import login from './login/index.ts';
import logout from './logout/index.ts';
import theme from './theme/index.ts';
import vim from './vim/index.ts';
import diff from './diff/index.ts';
import session from './session/index.ts';
import stats from './stats/index.ts';
import tasks from './tasks/index.ts';
import upgrade from './upgrade/index.ts';
import version from './version/index.ts';
import tag from './tag/index.ts';
import resume from './resume/index.ts';
import exportCommand from './export/index.ts';
import exit from './exit/index.ts';
import ide from './ide/index.ts';
import feedback from './feedback/index.ts';
import bugReport from './bug-report/index.ts';
import init from './init/index.ts';
import commit from './commit/index.ts';

export class CommandRegistryImpl implements CommandRegistry {
  readonly commands: Map<string, CommandDefinition>;

  constructor() {
    this.commands = new Map();
  }

  register(cmd: CommandDefinition): void {
    this.commands.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.commands.set(alias, cmd);
      }
    }
  }

  unregister(name: string): void {
    const cmd = this.commands.get(name);
    if (!cmd) return;

    this.commands.delete(name);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        if (this.commands.get(alias) === cmd) {
          this.commands.delete(alias);
        }
      }
    }
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(): CommandDefinition[] {
    const seen = new Set<string>();
    const result: CommandDefinition[] = [];
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        result.push(cmd);
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  find(name: string): CommandDefinition | undefined {
    // Exact match first
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // Prefix match
    const lower = name.toLowerCase();
    for (const [key, cmd] of this.commands) {
      if (key.startsWith(lower)) {
        return cmd;
      }
    }

    // Fuzzy match (contains)
    for (const [key, cmd] of this.commands) {
      if (key.includes(lower)) {
        return cmd;
      }
    }

    return undefined;
  }

  async execute(name: string, ctx: CommandContext): Promise<CommandResult> {
    const cmd = this.find(name);
    if (!cmd) {
      return {
        success: false,
        message: `Unknown command: ${name}. Type /help for available commands.`,
      };
    }

    try {
      const result = await cmd.execute(ctx);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Command error: ${message}`,
      };
    }
  }
}

let registryInstance: CommandRegistryImpl | null = null;

export function getCommandRegistry(): CommandRegistryImpl {
  if (!registryInstance) {
    registryInstance = new CommandRegistryImpl();
    registryInstance.register(help);
    registryInstance.register(clear);
    registryInstance.register(config);
    registryInstance.register(context);
    registryInstance.register(cost);
    registryInstance.register(doctor);
    registryInstance.register(memory);
    registryInstance.register(model);
    registryInstance.register(permissions);
    registryInstance.register(plan);
    registryInstance.register(review);
    registryInstance.register(status);
    registryInstance.register(compact);
    registryInstance.register(hooks);
    registryInstance.register(mcp);
    registryInstance.register(skills);
    registryInstance.register(login);
    registryInstance.register(logout);
    registryInstance.register(theme);
    registryInstance.register(vim);
    registryInstance.register(diff);
    registryInstance.register(session);
    registryInstance.register(stats);
    registryInstance.register(tasks);
    registryInstance.register(upgrade);
    registryInstance.register(version);
    registryInstance.register(tag);
    registryInstance.register(resume);
    registryInstance.register(exportCommand);
    registryInstance.register(exit);
    registryInstance.register(ide);
    registryInstance.register(feedback);
    registryInstance.register(bugReport);
    registryInstance.register(init);
    registryInstance.register(commit);
  }
  return registryInstance;
}
