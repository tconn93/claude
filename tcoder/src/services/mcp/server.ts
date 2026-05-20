import type { ToolDefinition } from '../../types/tool.ts';
import type { MCPMessage, MCPResponse, MCPTool, MCPResource, MCPPrompt } from './types.ts';

export interface MCPServerOptions {
  name: string;
  version: string;
  tools?: Map<string, ToolDefinition>;
  resources?: Map<string, { uri: string; name: string; description?: string; mimeType?: string; read: () => Promise<string> }>;
  prompts?: Map<string, { name: string; description?: string; get: (args?: Record<string, string>) => Promise<{ messages: { role: 'user' | 'assistant'; content: string }[] }> }>;
}

export class MCPServer {
  private options: MCPServerOptions;
  private connected = false;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];
  private prompts: MCPPrompt[] = [];

  constructor(options: MCPServerOptions) {
    this.options = options;
    this.buildToolList();
    this.buildResourceList();
    this.buildPromptList();
  }

  async handleRequest(request: MCPMessage): Promise<MCPResponse | null> {
    if (!('id' in request) || !('method' in request)) {
      return null;
    }

    const { id, method, params } = request as { id: number | string; method: string; params?: Record<string, unknown> };

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params);
        case 'tools/list':
          return this.handleToolsList(id);
        case 'tools/call':
          return this.handleToolCall(id, params);
        case 'resources/list':
          return this.handleResourcesList(id);
        case 'resources/read':
          return this.handleResourceRead(id, params);
        case 'prompts/list':
          return this.handlePromptsList(id);
        case 'prompts/get':
          return this.handlePromptGet(id, params);
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private handleInitialize(
    id: number | string,
    _params?: Record<string, unknown>,
  ): MCPResponse {
    this.connected = true;

    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: this.options.name,
          version: this.options.version,
        },
      },
    };
  }

  private handleToolsList(id: number | string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: this.tools,
      },
    };
  }

  private async handleToolCall(
    id: number | string,
    params?: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const toolName = params?.name as string;
    const toolArgs = params?.arguments as Record<string, unknown> ?? {};

    if (!toolName) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Missing tool name' },
      };
    }

    const tool = this.options.tools?.get(toolName);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      };
    }

    try {
      const result = await tool.execute(toolArgs, {
        sessionId: 'mcp-server',
        toolUseId: String(id),
        messageId: String(id),
        signal: new AbortController().signal,
        permissionMode: 'bypassPermissions',
        workingDirectory: process.cwd(),
        messages: [],
      });

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: result.content,
            },
          ],
          isError: result.isError ?? false,
        },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private handleResourcesList(id: number | string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resources: this.resources,
      },
    };
  }

  private async handleResourceRead(
    id: number | string,
    params?: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const uri = params?.uri as string;
    if (!uri) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Missing resource URI' },
      };
    }

    const resource = this.options.resources?.get(uri);
    if (!resource) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Resource not found: ${uri}` },
      };
    }

    try {
      const content = await resource.read();

      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri,
              mimeType: resource.mimeType ?? 'text/plain',
              text: content,
            },
          ],
        },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  private handlePromptsList(id: number | string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        prompts: this.prompts,
      },
    };
  }

  private async handlePromptGet(
    id: number | string,
    params?: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const promptName = params?.name as string;
    const promptArgs = params?.arguments as Record<string, string>;

    if (!promptName) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Missing prompt name' },
      };
    }

    const prompt = this.options.prompts?.get(promptName);
    if (!prompt) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Prompt not found: ${promptName}` },
      };
    }

    try {
      const result = await prompt.get(promptArgs);

      return {
        jsonrpc: '2.0',
        id,
        result: {
          messages: result.messages.map((m) => ({
            role: m.role,
            content: {
              type: 'text',
              text: m.content,
            },
          })),
        },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  private buildToolList(): void {
    if (!this.options.tools) return;

    this.tools = [];
    for (const [name, tool] of this.options.tools) {
      this.tools.push({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverName: this.options.name,
      });
    }
  }

  private buildResourceList(): void {
    if (!this.options.resources) return;

    this.resources = [];
    for (const [, resource] of this.options.resources) {
      this.resources.push({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverName: this.options.name,
      });
    }
  }

  private buildPromptList(): void {
    if (!this.options.prompts) return;

    this.prompts = [];
    for (const [, prompt] of this.options.prompts) {
      this.prompts.push({
        name: prompt.name,
        description: prompt.description,
        serverName: this.options.name,
      });
    }
  }
}
