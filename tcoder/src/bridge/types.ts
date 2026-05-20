export interface BridgeConfig {
  enabled: boolean;
  port: number;
  host: string;
  secure: boolean;
  authToken?: string;
  allowedOrigins: string[];
}

export interface BridgeMessage {
  type: 'request' | 'response' | 'event' | 'error';
  id: string;
  sessionId: string;
  data: unknown;
  timestamp: number;
}

export interface BridgeSession {
  id: string;
  status: 'active' | 'idle' | 'disconnected';
  createdAt: number;
  lastActivity: number;
  metadata: Record<string, unknown>;
}

export interface BridgeAuthPayload {
  sessionId: string;
  userId: string;
  exp: number;
  iat: number;
}

export const BRIDGE_LOGIN_ERROR = 'Authentication required. Please run /login first.';

export const BRIDGE_DEFAULT_PORT = 18779;
export const BRIDGE_DEFAULT_HOST = '127.0.0.1';

export interface BridgeStatus {
  connected: boolean;
  port: number;
  activeSessions: number;
  uptime: number;
  version: string;
}
