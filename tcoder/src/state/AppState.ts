import type {
  AppState,
  Conversation,
  Message,
  TokenUsage,
} from './types.ts';
import type { PermissionMode, PermissionConfig } from '../types/permissions.ts';
import { DEFAULT_MODEL } from '../constants/common.ts';

const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  rules: [],
  defaultMode: 'default' as PermissionMode,
  denyList: [],
};

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `tc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export class AppStateManager {
  static createDefault(): AppState {
    const sessionId = generateId();
    return {
      sessionId,
      isActive: false,
      startTime: Date.now(),

      messages: [],
      conversation: null,

      model: DEFAULT_MODEL,
      fastMode: false,

      permissionMode: 'default' as PermissionMode,
      permissionConfig: { ...DEFAULT_PERMISSION_CONFIG },

      isThinking: false,
      currentProgress: null,
      inputHistory: [],
      inputHistoryIndex: -1,
      showHelp: false,

      workingDirectory: process.cwd(),
      gitBranch: null,
      gitStatus: null,

      activeTools: new Map(),

      theme: 'system',
      config: {},
    };
  }

  static resetSession(state: AppState): AppState {
    return {
      ...state,
      sessionId: generateId(),
      startTime: Date.now(),
      messages: [],
      conversation: null,
      isThinking: false,
      currentProgress: null,
      activeTools: new Map(),
    };
  }

  static createConversation(model?: string): Conversation {
    return {
      id: generateId(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: model ?? DEFAULT_MODEL,
      title: undefined,
      tags: undefined,
    };
  }
}

export function getTotalTokens(usage: TokenUsage): number {
  return (
    usage.inputTokens +
    usage.outputTokens +
    (usage.cacheCreationInputTokens ?? 0) +
    (usage.cacheReadInputTokens ?? 0)
  );
}

export function selectMessages(state: AppState): Message[] {
  return state.messages;
}

export function selectConversation(state: AppState): Conversation | null {
  return state.conversation;
}

export function selectModel(state: AppState): string {
  return state.model;
}

export function selectPermissionMode(state: AppState): PermissionMode {
  return state.permissionMode;
}

export function selectIsActive(state: AppState): boolean {
  return state.isActive;
}

export function selectSessionId(state: AppState): string {
  return state.sessionId;
}

export function selectTheme(state: AppState): string {
  return state.theme;
}

export function selectWorkingDirectory(state: AppState): string {
  return state.workingDirectory;
}

export function selectActiveToolCount(state: AppState): number {
  return state.activeTools.size;
}

export function selectIsThinking(state: AppState): boolean {
  return state.isThinking;
}

export function selectInputHistory(state: AppState): string[] {
  return state.inputHistory;
}
