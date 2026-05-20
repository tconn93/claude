import type { PermissionMode } from '../../types/permissions.ts';

export interface AppSettings {
  version: number;
  model: string;
  permissionMode: PermissionMode;
  theme: string;
  editor: string;
  shell: string;
  workingDirectory: string;
  maxTokens: number;
  temperature: number;
  verbose: boolean;
  debug: boolean;
  autoCompact: boolean;
  compactThreshold: number;
  enableHooks: boolean;
  enableMCP: boolean;
  enableSandbox: boolean;
  enableGitHub: boolean;
  customPrompts: Record<string, string>;
  env: Record<string, string>;
  tools: ToolsSettings;
  ui: UISettings;
  git: GitSettings;
  proxy: ProxySettings;
}

export interface ToolsSettings {
  bashTimeout: number;
  maxFileSize: number;
  maxSearchResults: number;
  allowedTools: string[];
  blockedTools: string[];
}

export interface UISettings {
  showProgress: boolean;
  showTimestamps: boolean;
  showTokenCount: boolean;
  showToolCalls: boolean;
  colorScheme: 'dark' | 'light' | 'auto';
  inputMode: 'inline' | 'multiline';
  maxHistory: number;
}

export interface GitSettings {
  autoStage: boolean;
  autoCommit: boolean;
  commitStyle: 'conventional' | 'simple' | 'custom';
  commitTemplate: string;
  signCommits: boolean;
}

export interface ProxySettings {
  http: string | null;
  https: string | null;
  noProxy: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  model: 'grok-4.3',
  permissionMode: 'default',
  theme: 'default',
  editor: '',
  shell: '',
  workingDirectory: '',
  maxTokens: 8192,
  temperature: 0.7,
  verbose: false,
  debug: false,
  autoCompact: true,
  compactThreshold: 400,
  enableHooks: true,
  enableMCP: true,
  enableSandbox: true,
  enableGitHub: true,
  customPrompts: {},
  env: {},
  tools: {
    bashTimeout: 120_000,
    maxFileSize: 10 * 1024 * 1024,
    maxSearchResults: 100,
    allowedTools: [],
    blockedTools: [],
  },
  ui: {
    showProgress: true,
    showTimestamps: false,
    showTokenCount: true,
    showToolCalls: true,
    colorScheme: 'auto',
    inputMode: 'inline',
    maxHistory: 1000,
  },
  git: {
    autoStage: false,
    autoCommit: false,
    commitStyle: 'conventional',
    commitTemplate: '',
    signCommits: false,
  },
  proxy: {
    http: null,
    https: null,
    noProxy: null,
  },
};

export type SettingsPath = string;
export type SettingsPartial = Partial<AppSettings>;
