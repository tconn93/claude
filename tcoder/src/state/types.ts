import type { Message, Conversation } from '../types/message.ts';
import type { PermissionConfig, PermissionMode } from '../types/permissions.ts';

export interface AppState {
  // Session
  sessionId: string;
  isActive: boolean;
  startTime: number;

  // Conversation
  messages: Message[];
  conversation: Conversation | null;

  // Model
  model: string;
  fastMode: boolean;

  // Permissions
  permissionMode: PermissionMode;
  permissionConfig: PermissionConfig;

  // UI
  isThinking: boolean;
  currentProgress: string | null;
  inputHistory: string[];
  inputHistoryIndex: number;
  showHelp: boolean;

  // Context
  workingDirectory: string;
  gitBranch: string | null;
  gitStatus: string | null;

  // Tools
  activeTools: Map<string, AbortController>;

  // Settings
  theme: string;
  config: Record<string, unknown>;
}

export interface AppStateStore {
  getState: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  subscribe: (listener: (state: AppState) => void) => () => void;
}
