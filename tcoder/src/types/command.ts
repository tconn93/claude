import type { AppState } from '../state/types.ts';

export interface CommandContext {
  state: AppState;
  args: string[];
  flags: Record<string, string | boolean>;
  signal: AbortSignal;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  exitCode?: number;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  args?: CommandArg[];
  flags?: CommandFlag[];
  isEnabled?: (ctx: CommandContext) => boolean | Promise<boolean>;
  execute: (ctx: CommandContext) => Promise<CommandResult>;
  renderResult?: (result: CommandResult) => string;
}

export interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  choices?: string[];
}

export interface CommandFlag {
  name: string;
  short?: string;
  description: string;
  type: 'boolean' | 'string';
  default?: string | boolean;
}

export interface CommandRegistry {
  commands: Map<string, CommandDefinition>;
  register: (cmd: CommandDefinition) => void;
  unregister: (name: string) => void;
  get: (name: string) => CommandDefinition | undefined;
  list: () => CommandDefinition[];
  find: (name: string) => CommandDefinition | undefined;
  execute: (name: string, ctx: CommandContext) => Promise<CommandResult>;
}
