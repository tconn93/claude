import type { ChildProcess } from 'node:child_process';
import type { MCPServerConfig, MCPMessage, MCPResponse } from './types.ts';
import { MCPErrorCode } from './types.ts';

export interface MCPTransport {
  readonly name: string;
  readonly connected: boolean;
  connect(config: MCPServerConfig): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPMessage): Promise<void>;
  onMessage: ((message: MCPMessage) => void) | null;
  onClose: ((code?: number) => void) | null;
  onError: ((error: Error) => void) | null;
}

abstract class BaseTransport implements MCPTransport {
  abstract readonly name: string;
  abstract readonly connected: boolean;
  abstract connect(config: MCPServerConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: MCPMessage): Promise<void>;

  onMessage: ((message: MCPMessage) => void) | null = null;
  onClose: ((code?: number) => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  protected emitMessage(message: MCPMessage): void {
    this.onMessage?.(message);
  }

  protected emitClose(code?: number): void {
    this.onClose?.(code);
  }

  protected emitError(error: Error): void {
    this.onError?.(error);
  }
}

export class StdioTransport extends BaseTransport {
  readonly name = 'stdio';
  private process: ChildProcess | null = null;
  private buffer = '';
  private messageId = 0;
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  async connect(config: MCPServerConfig): Promise<void> {
    if (!config.command) {
      throw new Error('StdioTransport requires a command');
    }

    const { spawn, type } = await import('node:child_process');

    this.process = spawn(config.command, config.args ?? [], {
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      // Log stderr but don't treat as protocol data
      console.error(`[MCP ${config.name} stderr]:`, data.toString().trim());
    });

    this.process.on('close', (code) => {
      this._connected = false;
      this.emitClose(code ?? undefined);
    });

    this.process.on('error', (err) => {
      this._connected = false;
      this.emitError(err);
    });

    this._connected = true;

    // Send initialize request
    const initResponse = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      clientInfo: {
        name: 'tcoder',
        version: '0.1.0',
      },
    });

    if (initResponse.error) {
      throw new Error(`MCP initialization failed: ${initResponse.error.message}`);
    }

    // Send initialized notification
    await this.sendNotification('notifications/initialized', {});
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this._connected = false;
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('Not connected');
    }
    const line = JSON.stringify(message) + '\n';
    this.process.stdin.write(line);
  }

  async sendRequest(method: string, params?: Record<string, unknown>): Promise<MCPResponse> {
    const id = ++this.messageId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    await this.send(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MCP request timeout: ${method}`));
      }, 30000);

      const originalHandler = this.onMessage;
      this.onMessage = (msg: MCPMessage) => {
        if ('id' in msg && msg.id === id) {
          clearTimeout(timeout);
          this.onMessage = originalHandler;
          resolve(msg as MCPResponse);
        } else {
          originalHandler?.(msg);
        }
      };
    });
  }

  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    await this.send({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  private processBuffer(): void {
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex).trim();
      this.buffer = this.buffer.substring(newlineIndex + 1);

      if (line.length === 0) continue;

      try {
        const message = JSON.parse(line) as MCPMessage;
        this.emitMessage(message);
      } catch {
        this.emitError(new Error(`Failed to parse MCP message: ${line}`));
      }
    }
  }
}

export class SSETransport extends BaseTransport {
  readonly name = 'sse';
  private url: string | null = null;
  private headers: Record<string, string> = {};
  private eventSource: EventSource | null = null;
  private fetchConfig: RequestInit = {};
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  async connect(config: MCPServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error('SSETransport requires a URL');
    }

    this.url = config.url;
    this.headers = config.headers ?? {};

    try {
      const response = await fetch(`${this.url}/sse`, {
        headers: {
          Accept: 'text/event-stream',
          ...this.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body for SSE');
      }

      this._connected = true;

      // Process SSE stream
      const decoder = new TextDecoder();
      let buffer = '';

      const processSSE = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const lines = event.split('\n');
            let data = '';
            let eventType = 'message';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                data += line.slice(6);
              } else if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              }
            }

            if (data) {
              try {
                const parsed = JSON.parse(data) as MCPMessage;
                this.emitMessage(parsed);
              } catch {
                // Non-JSON SSE data, skip
              }
            }
          }
        }

        this._connected = false;
        this.emitClose();
      };

      processSSE().catch((err) => {
        this.emitError(err);
      });
    } catch (error) {
      this._connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.emitClose();
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.url) {
      throw new Error('Not connected');
    }

    const response = await fetch(`${this.url}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(message),
      ...this.fetchConfig,
    });

    if (!response.ok) {
      throw new Error(`SSE send failed: HTTP ${response.status}`);
    }
  }
}

export function createTransport(config: MCPServerConfig): MCPTransport {
  switch (config.transport) {
    case 'stdio':
      return new StdioTransport();
    case 'sse':
    case 'websocket':
      return new SSETransport();
    default:
      throw new Error(`Unknown transport type: ${config.transport}`);
  }
}
