import type { MCPServerConfig } from './config.ts';

export type MCPConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'disconnecting';

export interface MCPConnectionInfo {
  serverName: string;
  state: MCPConnectionState;
  connectedAt: number | null;
  lastActivity: number | null;
  error: string | null;
  requestCount: number;
}

export class MCPConnection {
  public serverName: string;
  public config: MCPServerConfig;
  private _state: MCPConnectionState = 'disconnected';
  private connectedAt: number | null = null;
  private lastActivity: number | null = null;
  private error: string | null = null;
  private requestCount = 0;
  private abortController: AbortController | null = null;

  constructor(serverName: string, config: MCPServerConfig) {
    this.serverName = serverName;
    this.config = config;
  }

  get state(): MCPConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  get info(): MCPConnectionInfo {
    return {
      serverName: this.serverName,
      state: this._state,
      connectedAt: this.connectedAt,
      lastActivity: this.lastActivity,
      error: this.error,
      requestCount: this.requestCount,
    };
  }

  async connect(): Promise<boolean> {
    if (this._state === 'connected') return true;

    this._state = 'connecting';
    this.error = null;

    try {
      await this.initializeConnection();
      this._state = 'connected';
      this.connectedAt = Date.now();
      this.lastActivity = Date.now();
      return true;
    } catch (err: unknown) {
      this._state = 'error';
      this.error = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this._state === 'disconnected') return;

    this._state = 'disconnecting';

    try {
      this.abortController?.abort();
      this.abortController = null;
    } finally {
      this._state = 'disconnected';
      this.connectedAt = null;
    }
  }

  async sendRequest(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (this._state !== 'connected') {
      const connected = await this.connect();
      if (!connected) {
        throw new Error(`Cannot send request to '${this.serverName}': not connected`);
      }
    }

    this.lastActivity = Date.now();
    this.requestCount++;

    const response = await this.executeRequest(method, params);
    return response;
  }

  getAbortController(): AbortController {
    if (!this.abortController) {
      this.abortController = new AbortController();
    }
    return this.abortController;
  }

  resetCounters(): void {
    this.requestCount = 0;
  }

  private async initializeConnection(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for MCP server '${this.serverName}'`));
      }, this.config.timeout ?? 30_000);

      try {
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  private async executeRequest(_method: string, _params: Record<string, unknown>): Promise<unknown> {
    return {};
  }
}

export class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();

  register(serverName: string, config: MCPServerConfig): MCPConnection {
    const existing = this.connections.get(serverName);
    if (existing) return existing;

    const connection = new MCPConnection(serverName, config);
    this.connections.set(serverName, connection);
    return connection;
  }

  unregister(serverName: string): boolean {
    return this.connections.delete(serverName);
  }

  get(serverName: string): MCPConnection | undefined {
    return this.connections.get(serverName);
  }

  has(serverName: string): boolean {
    return this.connections.has(serverName);
  }

  async connectAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = Array.from(this.connections.entries()).map(async ([name, conn]) => {
      const success = await conn.connect();
      results.set(name, success);
    });
    await Promise.all(promises);
    return results;
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(conn => conn.disconnect());
    await Promise.all(promises);
  }

  listConnections(): MCPConnectionInfo[] {
    return Array.from(this.connections.values()).map(c => c.info);
  }

  getActiveConnections(): MCPConnection[] {
    return Array.from(this.connections.values()).filter(c => c.isConnected);
  }

  getConnectedCount(): number {
    return this.getActiveConnections().length;
  }
}

export function createMCPConnectionManager(): MCPConnectionManager {
  return new MCPConnectionManager();
}
