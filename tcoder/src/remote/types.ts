export interface RemoteSession {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  remoteHost: string;
  remotePort: number;
  localPort: number;
  connectedAt?: number;
  lastActivity: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface RemoteConfig {
  enabled: boolean;
  sessions: RemoteSession[];
  defaultPort: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface SDKMessage {
  type: 'request' | 'response' | 'notification';
  id?: string;
  method: string;
  params?: unknown;
  result?: unknown;
  error?: SDKError;
}

export interface SDKError {
  code: number;
  message: string;
  data?: unknown;
}

export interface SDKStatus {
  connected: boolean;
  sessions: number;
  uptime: number;
  version: string;
}
