import type { Message } from './message.ts';

export type HookType = 'preToolUse' | 'postToolUse' | 'preMessage' | 'postMessage' | 'onStop' | 'onResume';

export interface HookDefinition {
  type: HookType;
  command: string;
  timeout?: number;
  matcher?: string;
}

export interface HookEvent {
  type: HookType;
  sessionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface HookProgress {
  hookType: HookType;
  command: string;
  status: 'running' | 'completed' | 'error';
  output?: string;
  error?: string;
}

export interface Prompts {
  systemPrompt: string[];
  tools: string[];
  context: string[];
  user: string[];
}

export type PromptRequest = {
  type: 'system' | 'tools' | 'context' | 'user';
  messages: Message[];
  model: string;
};

export type PromptResponse = {
  content: string;
  metadata?: Record<string, unknown>;
};
