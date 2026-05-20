import type { ChildProcess } from 'node:child_process';

export interface LSPClientConfig {
  command: string;
  args?: string[];
  rootUri: string;
  capabilities?: Record<string, unknown>;
  initializationOptions?: Record<string, unknown>;
  env?: Record<string, string>;
  timeout?: number;
}

export interface LSPMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export interface LSPServerInfo {
  name: string;
  version: string;
  capabilities: Record<string, unknown>;
}

export interface LSPPosition {
  line: number;
  character: number;
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPLocation {
  uri: string;
  range: LSPRange;
}

export interface LSPDiagnostic {
  range: LSPRange;
  severity?: 1 | 2 | 3 | 4;
  code?: string | number;
  source?: string;
  message: string;
}

export class LSPClient {
  private process: ChildProcess | null = null;
  private buffer = '';
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private serverCapabilities: Record<string, unknown> = {};
  private serverInfo: LSPServerInfo | null = null;
  private _connected = false;
  private config: LSPClientConfig;

  onNotification: ((method: string, params: Record<string, unknown>) => void) | null = null;
  onDiagnostics: ((uri: string, diagnostics: LSPDiagnostic[]) => void) | null = null;
  onError: ((error: Error) => void) | null = null;
  onClose: (() => void) | null = null;

  constructor(config: LSPClientConfig) {
    this.config = config;
  }

  get connected(): boolean {
    return this._connected;
  }

  get capabilities(): Record<string, unknown> {
    return this.serverCapabilities;
  }

  async start(): Promise<LSPServerInfo> {
    if (this._connected) {
      throw new Error('LSP client is already connected');
    }

    const { spawn } = await import('node:child_process');

    this.process = spawn(this.config.command, this.config.args ?? [], {
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      // LSP servers use stderr for logging, not protocol
    });

    this.process.on('close', (code) => {
      this._connected = false;
      this.onClose?.();
    });

    this.process.on('error', (error) => {
      this._connected = false;
      this.onError?.(error);
    });

    // Initialize
    const initResult = await this.sendRequest('initialize', {
      processId: process.pid,
      rootUri: this.config.rootUri,
      capabilities: this.config.capabilities ?? {
        textDocument: {
          synchronization: { didSave: true, didChange: true },
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          formatting: {},
          codeAction: {},
        },
      },
      initializationOptions: this.config.initializationOptions,
    });

    const result = initResult as Record<string, unknown>;
    this.serverCapabilities = (result.capabilities as Record<string, unknown>) ?? {};
    this.serverInfo = (result.serverInfo as LSPServerInfo) ?? null;

    await this.sendNotification('initialized', {});
    this._connected = true;

    return {
      name: this.serverInfo?.name ?? this.config.command,
      version: this.serverInfo?.version ?? 'unknown',
      capabilities: this.serverCapabilities,
    };
  }

  async stop(): Promise<void> {
    if (this.process) {
      try {
        await this.sendNotification('shutdown', {});
      } catch {
        // Ignore
      }
      this.process.kill();
      this.process = null;
    }
    this._connected = false;
  }

  async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error('LSP client not connected');
    }

    const id = ++this.requestId;
    const message: LSPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    this.sendMessage(message);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LSP request timeout: ${method}`));
      }, this.config.timeout ?? 30000);

      this.pendingRequests.set(id, {
        resolve: (result: unknown) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.sendMessage(message);
  }

  async openDocument(uri: string, languageId: string, text: string, version = 1): Promise<void> {
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text,
      },
    });
  }

  async changeDocument(uri: string, text: string, version: number): Promise<void> {
    await this.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [{ text }],
    });
  }

  async closeDocument(uri: string): Promise<void> {
    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  async saveDocument(uri: string): Promise<void> {
    await this.sendNotification('textDocument/didSave', {
      textDocument: { uri },
    });
  }

  async getDiagnostics(uri: string): Promise<LSPDiagnostic[]> {
    const result = await this.sendRequest('textDocument/diagnostic', {
      textDocument: { uri },
    });
    const data = result as { items?: LSPDiagnostic[] };
    return data.items ?? [];
  }

  async getDocumentSymbols(uri: string): Promise<unknown[]> {
    const result = await this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri },
    });
    return result as unknown[];
  }

  async getHover(uri: string, position: LSPPosition): Promise<{ contents: unknown; range?: LSPRange } | null> {
    const result = await this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position,
    });
    return result as { contents: unknown; range?: LSPRange } | null;
  }

  async getDefinition(uri: string, position: LSPPosition): Promise<LSPLocation[]> {
    const result = await this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position,
    });

    if (!result) return [];

    if (Array.isArray(result)) {
      return result as LSPLocation[];
    }

    return [result as LSPLocation];
  }

  async getReferences(
    uri: string,
    position: LSPPosition,
    includeDeclaration = false,
  ): Promise<LSPLocation[]> {
    const result = await this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration },
    });
    return (result as LSPLocation[]) ?? [];
  }

  async getCodeActions(
    uri: string,
    range: LSPRange,
    context?: { diagnostics?: LSPDiagnostic[] },
  ): Promise<unknown[]> {
    const result = await this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: context ?? { diagnostics: [] },
    });
    return (result as unknown[]) ?? [];
  }

  async formatDocument(uri: string): Promise<{ range: LSPRange; newText: string }[]> {
    const result = await this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options: { tabSize: 2, insertSpaces: true },
    });
    return (result as { range: LSPRange; newText: string }[]) ?? [];
  }

  private sendMessage(message: LSPMessage): void {
    if (!this.process?.stdin) {
      throw new Error('LSP client not connected');
    }
    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    this.process.stdin.write(header + content);
  }

  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headerStr = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headerStr.match(/Content-Length: (\d+)/i);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const contentStart = headerEnd + 4;

      if (this.buffer.length < contentStart + contentLength) break;

      const content = this.buffer.substring(contentStart, contentStart + contentLength);
      this.buffer = this.buffer.substring(contentStart + contentLength);

      try {
        const message = JSON.parse(content) as LSPMessage;
        this.handleMessage(message);
      } catch {
        // Malformed message, skip
      }
    }
  }

  private handleMessage(message: LSPMessage): void {
    if (message.id !== undefined && 'method' in message) {
      // Request from server
      this.onNotification?.(message.method!, message.params ?? {});
    } else if (message.id !== undefined) {
      // Response
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        this.pendingRequests.delete(message.id as number);
        if (message.error) {
          pending.reject(new Error(`LSP error: ${message.error.message}`));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // Notification
      if (message.method === 'textDocument/publishDiagnostics') {
        const params = message.params as { uri: string; diagnostics: LSPDiagnostic[] };
        this.onDiagnostics?.(params.uri, params.diagnostics);
      }
      this.onNotification?.(message.method, message.params ?? {});
    }
  }
}
