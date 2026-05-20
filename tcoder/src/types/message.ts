export type MessageRole = 'user' | 'assistant' | 'system';

export interface UserMessage {
  type: 'user';
  role: 'user';
  content: string | ContentBlock[];
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  timestamp?: number;
}

export interface AssistantMessage {
  type: 'assistant';
  role: 'assistant';
  content: (TextBlock | ToolUseBlock | ThinkingBlock)[];
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  timestamp?: number;
  model?: string;
  usage?: TokenUsage;
  stopReason?: string;
}

export interface SystemMessage {
  type: 'system';
  role: 'system';
  content: string;
  uuid?: string;
  subtype?: 'init' | 'compact' | 'error' | 'hook' | 'internal';
  timestamp?: number;
}

export interface ProgressMessage {
  type: 'progress';
  role: 'assistant';
  content: string;
  uuid?: string;
  parentUuid?: string;
  timestamp?: number;
}

export interface AttachmentMessage {
  type: 'attachment';
  content: AttachmentContent[];
  uuid?: string;
  timestamp?: number;
}

export interface SystemLocalCommandMessage {
  type: 'local-command';
  content: string;
  uuid?: string;
  timestamp?: number;
}

export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ProgressMessage
  | AttachmentMessage
  | SystemLocalCommandMessage;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: ImageSource;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  toolUseId?: string;
  content?: string | ContentBlock[];
  isError?: boolean;
}

export interface ImageSource {
  type: 'base64' | 'url';
  mediaType?: string;
  data?: string;
  url?: string;
}

export interface AttachmentContent {
  type: 'file' | 'image' | 'directory';
  path: string;
  content?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  title?: string;
  tags?: string[];
}
