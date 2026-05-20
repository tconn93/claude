import type { ToolInputSchema } from '../../types/tool.ts';
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPServerInfo,
  MCPResourceContent,
  MCPPromptResult,
} from './types.ts';
import { MCPErrorCode } from './types.ts';
import { type MCPTransport, createTransport } from './transport.ts';

export interface MCPClientConfig {
  serverConfig: MCPServerConfig;
  clientInfo?: {
    name: string;
    version: string;
  };
}

export class MCPClient {
  private config: MCPServerConfig;
  private transport: MCPTransport | null = null;
  private serverInfo: MCPServerInfo | null = null;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private prompts: MCPPrompt[] = [];
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (response: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private initialized = false;
  private _connected = false;

  constructor(clientConfig: MCPClientConfig) {
    this.config = clientConfig.serverConfig;
  }

  get connected(): boolean {
    return this._connected;
  }

  get initializedState(): boolean {
    return this.initialized;
  }

  get serverName(): string {
    return this.config.name;
  }

  get serverInformation(): MCPServerInfo | null {
    return this.serverInfo;
  }

  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    this.transport = createTransport(this.config);

    this.transport.onMessage = (msg) => {
      this.handleMessage(msg);
    };

    this.transport.onError = (err) => {
      this.handleError(err);
    };

    this.transport.onClose = () => {
      this.handleClose();
    };

    await this.transport.connect(this.config);

    const initResult = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
      clientInfo: {
        name: 'tcoder',
        version: '0.1.0',
      },
    });

    if (initResult && typeof initResult === 'object' && 'protocolVersion' in initResult) {
      this.serverInfo = initResult as unknown as MCPServerInfo;
    }

    await this.sendNotification('notifications/initialized', {});
    this.initialized = true;
    this._connected = true;

    // Discover capabilities
    await this.discoverTools();
    await this.discoverResources();
    await this.discoverPrompts();
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
    }
    this._connected = false;
    this.initialized = false;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
  }

  async listTools(): Promise<MCPTool[]> {
    return this.tools;
  }

  async callTool(
    toolName: string,
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    if (!this._connected || !this.transport) {
      throw new Error('MCP client not connected');
    }

    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: input,
    });

    return result as { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> };
  }

  async listResources(): Promise<MCPResource[]> {
    return this.resources;
  }

  async readResource(uri: string): Promise<MCPResourceContent[]> {
    if (!this._connected) {
      throw new Error('MCP client not connected');
    }

    const result = await this.sendRequest('resources/read', { uri });
    return (result as { contents: MCPResourceContent[] }).contents ?? [];
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    return this.prompts;
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<MCPPromptResult> {
    if (!this._connected) {
      throw new Error('MCP client not connected');
    }

    const result = await this.sendRequest('prompts/get', { name, arguments: args });
    return result as MCPPromptResult;
  }

  private async discoverTools(): Promise<void> {
    try {
      const result = await this.sendRequest('tools/list', {});
      const toolList = (result as { tools?: MCPTool[] }).tools ?? [];
      this.tools = toolList.map((t) => ({ ...t, serverName: this.config.name }));
    } catch {
      this.tools = [];
    }
  }

  private async discoverResources(): Promise<void> {
    try {
      const result = await this.sendRequest('resources/list', {});
      const resourceList = (result as { resources?: MCPResource[] }).resources ?? [];
      this.resources = resourceList.map((r) => ({ ...r, serverName: this.config.name }));
    } catch {
      this.resources = [];
    }
  }

  private async discoverPrompts(): Promise<void> {
    try {
      const result = await this.sendRequest('prompts/list', {});
      const promptList = (result as { prompts?: MCPPrompt[] }).prompts ?? [];
      this.prompts = promptList.map((p) => ({ ...p, serverName: this.config.name }));
    } catch {
      this.prompts = [];
    }
  }

  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.transport) {
      throw new Error('No transport');
    }

    const id = ++this.requestId;

    await this.transport.send({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, this.config.timeout ?? 30000);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.transport) {
      throw new Error('No transport');
    }

    await this.transport.send({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  private handleMessage(message: unknown): void {
    const msg = message as Record<string, unknown>;

    if ('id' in msg && msg.id !== undefined && msg.id !== null) {
      const pending = this.pendingRequests.get(msg.id as number | string);
      if (pending) {
        this.pendingRequests.delete(msg.id as number | string);
        if ('error' in msg) {
          pending.reject(new Error(`MCP error: ${JSON.stringify(msg.error)}`));
        } else {
          pending.resolve(msg.result);
        }
      }
    }
    // Notifications are handled separately via onMessage callback if needed
  }

  private handleError(error: Error): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private handleClose(): void {
    this._connected = false;
    this.initialized = false;

    const closeError = new Error('MCP connection closed');
    for (const [, pending] of this.pendingRequests) {
      pending.reject(closeError);
    }
    this.pendingRequests.clear();
  }
}
