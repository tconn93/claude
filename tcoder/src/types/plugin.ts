import type { ToolDefinition } from './tool.ts';
import type { CommandDefinition } from './command.ts';
import type { HookDefinition } from './hooks.ts';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  main: string;
  keywords?: string[];
}

export interface PluginDefinition {
  manifest: PluginManifest;
  path: string;
  tools: ToolDefinition[];
  commands: CommandDefinition[];
  hooks: HookDefinition[];
  skills: SkillDefinition[];
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  isLoaded: boolean;
  isEnabled: boolean;
}

export interface PluginRegistry {
  plugins: Map<string, PluginDefinition>;
  load: (path: string) => Promise<PluginDefinition>;
  unload: (name: string) => Promise<void>;
  get: (name: string) => PluginDefinition | undefined;
  list: () => PluginDefinition[];
  enable: (name: string) => Promise<void>;
  disable: (name: string) => Promise<void>;
}

export interface SkillDefinition {
  name: string;
  description: string;
  triggers?: string[];
  execute: (args: string) => Promise<string>;
}
