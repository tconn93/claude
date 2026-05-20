import type { MCPServerConfig, MCPTool, MCPResource, MCPPrompt } from './types.ts';
import { MCPClient } from './client.ts';
import { MCPAuthManager } from './auth.ts';

export interface RegisteredMCPServer {
  config: MCPServerConfig;
  client: MCPClient;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export class MCPRegistry {
  private servers = new Map<string, RegisteredMCPServer>();
  private authManager = new MCPAuthManager();

  register(config: MCPServerConfig): void {
    if (this.servers.has(config.name)) {
      throw new Error(`MCP server '${config.name}' is already registered`);
    }

    if (config.disabled) {
      return;
    }

    const client = new MCPClient({ serverConfig: config });

    this.servers.set(config.name, {
      config,
      client,
      status: 'disconnected',
      tools: [],
      resources: [],
      prompts: [],
    });
  }

  unregister(name: string): void {
    const server = this.servers.get(name);
    if (server) {
      server.client.disconnect().catch(() => {});
      this.servers.delete(name);
    }
  }

  async connect(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`MCP server '${name}' not found`);
    }

    if (server.status === 'connected') {
      return;
    }

    server.status = 'connecting';

    try {
      await server.client.connect();
      server.status = 'connected';
      server.error = undefined;

      server.tools = await server.client.listTools();
      server.resources = await server.client.listResources();
      server.prompts = await server.client.listPrompts();
    } catch (error) {
      server.status = 'error';
      server.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async connectAll(): Promise<{ connected: string[]; failed: Array<{ name: string; error: string }> }> {
    const connected: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    const servers = Array.from(this.servers.entries());

    await Promise.all(
      servers.map(async ([name]) => {
        try {
          await this.connect(name);
          connected.push(name);
        } catch (error) {
          failed.push({
            name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );

    return { connected, failed };
  }

  async disconnect(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      await server.client.disconnect();
      server.status = 'disconnected';
      server.tools = [];
      server.resources = [];
      server.prompts = [];
    }
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.servers.keys()).map((name) => this.disconnect(name)),
    );
  }

  getToolNames(): string[] {
    const names: string[] = [];
    for (const [, server] of this.servers) {
      if (server.status === 'connected') {
        for (const tool of server.tools) {
          names.push(`mcp__${server.config.name}__${tool.name}`);
        }
      }
    }
    return names;
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const [, server] of this.servers) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const [, server] of this.servers) {
      if (server.status === 'connected') {
        resources.push(...server.resources);
      }
    }
    return resources;
  }

  getAllPrompts(): MCPPrompt[] {
    const prompts: MCPPrompt[] = [];
    for (const [, server] of this.servers) {
      if (server.status === 'connected') {
        prompts.push(...server.prompts);
      }
    }
    return prompts;
  }

  async callTool(
    serverName: string,
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (server.status !== 'connected') {
      throw new Error(`MCP server '${serverName}' is not connected`);
    }

    return await server.client.callTool(toolName, input);
  }

  getServerStatus(name: string): RegisteredMCPServer | null {
    return this.servers.get(name) ?? null;
  }

  listServers(): RegisteredMCPServer[] {
    return Array.from(this.servers.values());
  }

  getConnectedServers(): RegisteredMCPServer[] {
    return Array.from(this.servers.values()).filter((s) => s.status === 'connected');
  }

  getAuthManager(): MCPAuthManager {
    return this.authManager;
  }

  hasServer(name: string): boolean {
    return this.servers.has(name);
  }

  clear(): void {
    this.disconnectAll().catch(() => {});
    this.servers.clear();
  }
}
