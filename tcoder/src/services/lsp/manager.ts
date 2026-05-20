import { LSPClient, type LSPClientConfig, type LSPDiagnostic, type LSPPosition, type LSPLocation, type LSPRange } from './client.ts';

export interface LSPManagerConfig {
  rootUri: string;
  languageServers?: Array<{
    id: string;
    languageIds: string[];
    command: string;
    args?: string[];
    env?: Record<string, string>;
    initializationOptions?: Record<string, unknown>;
  }>;
}

export interface LSPServerEntry {
  id: string;
  languageIds: string[];
  client: LSPClient;
  config: LSPClientConfig;
  status: 'stopped' | 'starting' | 'running' | 'error';
  error?: string;
}

export class LSPManager {
  private servers = new Map<string, LSPServerEntry>();
  private rootUri: string;
  private languageToServer = new Map<string, string>();

  constructor(config: LSPManagerConfig) {
    this.rootUri = config.rootUri;

    if (config.languageServers) {
      for (const serverConfig of config.languageServers) {
        this.registerServer(serverConfig);
      }
    }
  }

  registerServer(server: {
    id: string;
    languageIds: string[];
    command: string;
    args?: string[];
    env?: Record<string, string>;
    initializationOptions?: Record<string, unknown>;
  }): void {
    const client = new LSPClient({
      command: server.command,
      args: server.args,
      rootUri: this.rootUri,
      env: server.env,
      initializationOptions: server.initializationOptions,
    });

    client.onDiagnostics = (uri, diagnostics) => {
      this.handleDiagnostics(server.id, uri, diagnostics);
    };

    const entry: LSPServerEntry = {
      id: server.id,
      languageIds: server.languageIds,
      client,
      config: {
        command: server.command,
        args: server.args,
        rootUri: this.rootUri,
        env: server.env,
        initializationOptions: server.initializationOptions,
      },
      status: 'stopped',
    };

    this.servers.set(server.id, entry);

    for (const languageId of server.languageIds) {
      this.languageToServer.set(languageId, server.id);
    }
  }

  unregisterServer(id: string): void {
    const server = this.servers.get(id);
    if (server) {
      server.client.stop().catch(() => {});
      this.servers.delete(id);
      for (const [lang, serverId] of this.languageToServer) {
        if (serverId === id) {
          this.languageToServer.delete(lang);
        }
      }
    }
  }

  async startServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`LSP server '${id}' not found`);
    }

    if (server.status === 'running') {
      return;
    }

    server.status = 'starting';

    try {
      await server.client.start();
      server.status = 'running';
      server.error = undefined;
    } catch (error) {
      server.status = 'error';
      server.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async startServersForLanguage(languageId: string): Promise<void> {
    const serverId = this.languageToServer.get(languageId);
    if (serverId) {
      await this.startServer(serverId);
    }
  }

  async startAllServers(): Promise<void> {
    await Promise.all(
      Array.from(this.servers.keys()).map((id) => this.startServer(id).catch(() => {})),
    );
  }

  async stopServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (server) {
      await server.client.stop();
      server.status = 'stopped';
    }
  }

  async stopAllServers(): Promise<void> {
    await Promise.all(
      Array.from(this.servers.keys()).map((id) => this.stopServer(id)),
    );
  }

  async openDocument(uri: string, languageId: string, text: string): Promise<void> {
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return;

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return;

    try {
      await server.client.openDocument(uri, languageId, text);
    } catch {
      // Ignore
    }
  }

  async changeDocument(uri: string, text: string, version: number): Promise<void> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return;

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return;

    try {
      await server.client.changeDocument(uri, text, version);
    } catch {
      // Ignore
    }
  }

  async closeDocument(uri: string): Promise<void> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return;

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return;

    try {
      await server.client.closeDocument(uri);
    } catch {
      // Ignore
    }
  }

  async getDiagnostics(uri: string): Promise<LSPDiagnostic[]> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return [];

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return [];

    try {
      return await server.client.getDiagnostics(uri);
    } catch {
      return [];
    }
  }

  async getHover(uri: string, position: LSPPosition): Promise<{ contents: unknown; range?: LSPRange } | null> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return null;

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return null;

    try {
      return await server.client.getHover(uri, position);
    } catch {
      return null;
    }
  }

  async getDefinition(uri: string, position: LSPPosition): Promise<LSPLocation[]> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return [];

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return [];

    try {
      return await server.client.getDefinition(uri, position);
    } catch {
      return [];
    }
  }

  async getReferences(uri: string, position: LSPPosition): Promise<LSPLocation[]> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return [];

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return [];

    try {
      return await server.client.getReferences(uri, position);
    } catch {
      return [];
    }
  }

  async getDocumentSymbols(uri: string): Promise<unknown[]> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return [];

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return [];

    try {
      return await server.client.getDocumentSymbols(uri);
    } catch {
      return [];
    }
  }

  async getCodeActions(uri: string, range: LSPRange, diagnostics?: LSPDiagnostic[]): Promise<unknown[]> {
    const languageId = this.inferLanguageId(uri);
    const serverId = this.languageToServer.get(languageId);
    if (!serverId) return [];

    const server = this.servers.get(serverId);
    if (!server || server.status !== 'running') return [];

    try {
      return await server.client.getCodeActions(uri, range, { diagnostics });
    } catch {
      return [];
    }
  }

  getServerStatus(id: string): LSPServerEntry | null {
    return this.servers.get(id) ?? null;
  }

  listServers(): LSPServerEntry[] {
    return Array.from(this.servers.values());
  }

  getRunningServers(): LSPServerEntry[] {
    return Array.from(this.servers.values()).filter((s) => s.status === 'running');
  }

  private inferLanguageId(uri: string): string {
    const ext = uri.split('.').pop()?.toLowerCase() ?? '';

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascriptreact',
      json: 'json',
      css: 'css',
      html: 'html',
      md: 'markdown',
      py: 'python',
      rb: 'ruby',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      sh: 'shellscript',
      bash: 'shellscript',
      sql: 'sql',
      graphql: 'graphql',
      vue: 'vue',
      svelte: 'svelte',
    };

    return languageMap[ext] ?? 'plaintext';
  }

  private handleDiagnostics(serverId: string, uri: string, diagnostics: LSPDiagnostic[]): void {
    // Diagnostics are handled by the caller via onDiagnostics callback on each client
  }
}
