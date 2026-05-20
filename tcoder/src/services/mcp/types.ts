import type { ToolInputSchema } from '../../types/tool.ts';

export type MCPTransportType = 'stdio' | 'sse' | 'websocket';

export interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  transport: MCPTransportType;
  autoStart?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
  disabled?: boolean;
  description?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  serverName: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverName?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
  serverName?: string;
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: MCPResourceContent;
  };
}

export interface MCPPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

export type MCPCapability =
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'logging'
  | 'roots'
  | 'sampling';

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: Record<MCPCapability, Record<string, unknown>>;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export type MCPMessage = MCPRequest | MCPResponse | MCPNotification;

export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerNotInitialized = -32002,
  UnknownError = -32001,
}

export interface MCPAuthConfig {
  type: 'none' | 'oauth' | 'token' | 'api_key';
  token?: string;
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  headers?: Record<string, string>;
}
