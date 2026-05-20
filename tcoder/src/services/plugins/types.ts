import type { ToolDefinition } from '../../types/tool.ts';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  main: string;
  type: 'tool' | 'hook' | 'mcp-server' | 'lsp-server' | 'command' | 'theme';
  homepage?: string;
  repository?: string;
  keywords?: string[];
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
}

export interface Plugin {
  id: string;
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  status: 'loaded' | 'active' | 'error' | 'disabled';
  error?: string;
  loadedAt?: number;
  tools?: ToolDefinition[];
  hooks?: PluginHooks;
}

export interface PluginHooks {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
  getTools?: () => ToolDefinition[];
  getCommands?: () => Array<{ name: string; description: string; execute: (args: string[]) => Promise<void> }>;
}

export interface PluginConfig {
  pluginsDir: string;
  enabledPlugins: string[];
  autoLoad: boolean;
  allowUnsafe: boolean;
}

export interface PluginSearchResult {
  plugin: Plugin;
  matchScore: number;
}
