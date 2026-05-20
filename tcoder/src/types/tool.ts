import type { z } from 'zod';
import type { PermissionMode, PermissionResult } from './permissions.ts';
import type { Message } from './message.ts';

export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface ToolUseContext {
  sessionId: string;
  toolUseId: string;
  messageId: string;
  signal: AbortSignal;
  permissionMode: PermissionMode;
  workingDirectory: string;
  messages: Message[];
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ToolProgress {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TProgress = ToolProgress> {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  prompt?: string;
  isEnabled: (context: ToolUseContext) => boolean | Promise<boolean>;
  isReadOnly: boolean;
  canUse: (context: ToolUseContext) => PermissionResult | Promise<PermissionResult>;
  execute: (
    input: TInput,
    context: ToolUseContext,
    onProgress?: (progress: TProgress) => void,
  ) => Promise<ToolResult>;
  renderResult?: (result: ToolResult) => string;
  renderProgress?: (progress: TProgress) => string;
  formatPrompt?: (
    input: TInput,
    context: ToolUseContext,
  ) => string | Promise<string>;
  needsPermissions?: (input: TInput) => boolean;
}

export interface ToolRegistry {
  tools: Map<string, ToolDefinition>;
  register: (tool: ToolDefinition) => void;
  unregister: (name: string) => void;
  get: (name: string) => ToolDefinition | undefined;
  list: () => ToolDefinition[];
  match: (name: string) => ToolDefinition[];
  findByPattern: (pattern: string) => ToolDefinition[];
  getAllInputSchemas: () => Record<string, ToolInputSchema>;
  getReadOnlyTools: () => ToolDefinition[];
}

export type BashProgress = ToolProgress & { type: 'bash'; command: string; exitCode?: number };
export type FileReadProgress = ToolProgress & { type: 'file_read'; path: string };
export type FileEditProgress = ToolProgress & { type: 'file_edit'; path: string };
export type WebSearchProgress = ToolProgress & { type: 'web_search'; query: string };
export type WebFetchProgress = ToolProgress & { type: 'web_fetch'; url: string };
export type MCPProgress = ToolProgress & { type: 'mcp'; serverName: string; toolName: string };
export type REPLProgress = ToolProgress & { type: 'repl'; action: string };
export type AgentProgress = ToolProgress & { type: 'agent'; agentName: string; task: string };
export type SkillProgress = ToolProgress & { type: 'skill'; skillName: string };
export type TaskProgress = ToolProgress & { type: 'task'; taskId: string };

export type AnyToolProgress =
  | BashProgress
  | FileReadProgress
  | FileEditProgress
  | WebSearchProgress
  | WebFetchProgress
  | MCPProgress
  | REPLProgress
  | AgentProgress
  | SkillProgress
  | TaskProgress;
