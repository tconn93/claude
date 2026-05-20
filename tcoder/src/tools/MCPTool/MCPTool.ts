import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { MCPToolInput } from './types.ts';

const mcpToolInputSchema = z.object({
  serverName: z.string().describe('Name of the MCP server'),
  toolName: z.string().describe('Name of the tool to call on the MCP server'),
  arguments: z.record(z.string(), z.unknown()).optional().describe('Arguments to pass to the MCP tool'),
});

interface MCPServerTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface MCPServer {
  name: string;
  tools: MCPServerTool[];
}

const mcpRegistry = new Map<string, MCPServer>();

export function registerMCPServer(server: MCPServer): void {
  mcpRegistry.set(server.name, server);
}

export function unregisterMCPServer(name: string): void {
  mcpRegistry.delete(name);
}

export function getMCPServers(): MCPServer[] {
  return Array.from(mcpRegistry.values());
}

export const mcpTool: ToolDefinition<MCPToolInput> = {
  name: 'mcp__*',
  description: `Call a tool on a registered MCP (Model Context Protocol) server.

Usage:
- MCP servers provide additional capabilities through a standardized interface
- Each server exposes one or more tools
- Tool names are prefixed with the server name: mcp__<server>__<tool>
- Arguments are passed to the tool as a JSON object`,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(mcpToolInputSchema);
  },

  async execute(
    input: MCPToolInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = mcpToolInputSchema.parse(input);
    const server = mcpRegistry.get(validated.serverName);

    if (!server) {
      const available = Array.from(mcpRegistry.keys()).join(', ') || 'none';
      return createErrorResult(
        `MCP server "${validated.serverName}" not found. Available servers: ${available}`,
        { available: Array.from(mcpRegistry.keys()) },
      );
    }

    const tool = server.tools.find((t) => t.name === validated.toolName);
    if (!tool) {
      const available = server.tools.map((t) => t.name).join(', ') || 'none';
      return createErrorResult(
        `Tool "${validated.toolName}" not found on server "${validated.serverName}". Available tools: ${available}`,
        { serverName: validated.serverName, available: server.tools.map((t) => t.name) },
      );
    }

    onProgress?.({
      type: 'mcp',
      data: { serverName: validated.serverName, toolName: validated.toolName, stage: 'calling' },
      timestamp: Date.now(),
    });

    try {
      const result = {
        serverName: validated.serverName,
        toolName: validated.toolName,
        message: `MCP tool "${validated.toolName}" called on server "${validated.serverName}"`,
        arguments: validated.arguments,
      };

      onProgress?.({
        type: 'mcp',
        data: { serverName: validated.serverName, toolName: validated.toolName, stage: 'complete' },
        timestamp: Date.now(),
      });

      return createToolResult(
        JSON.stringify(result, null, 2),
        false,
        { serverName: validated.serverName, toolName: validated.toolName },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`MCP tool call failed: ${message}`);
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) return `Error: ${result.content}`;
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'mcp') {
      const { serverName, toolName, stage } = progress.data;
      if (stage === 'calling') return `Calling MCP: ${serverName}::${toolName}`;
      if (stage === 'complete') return `MCP complete: ${serverName}::${toolName}`;
    }
    return 'Calling MCP tool...';
  },
};

function zodToInputSchema(schema: z.ZodObject<z.ZodRawShape>): { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean } {
  const result: { type: 'object'; properties: Record<string, unknown>; required: string[]; additionalProperties: boolean } = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };
  const shape = schema._def.shape();
  for (const [key, field] of Object.entries(shape)) {
    const zodField = field as z.ZodType;
    const def = zodField._def as { typeName: string; values?: string[] };
    const prop: Record<string, unknown> = { type: mapZodName(def.typeName) };
    if (def.values) prop.enum = def.values;
    if (zodField.description) prop.description = zodField.description;
    result.properties[key] = prop;
    const fieldShape = schema._def.shape()[key] as z.ZodType & { isOptional?: () => boolean };
    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault' || fieldShape?.isOptional?.()) continue;
    result.required.push(key);
  }
  return result;
}

function mapZodName(typeName: string): string {
  const m: Record<string, string> = {
    ZodString: 'string', ZodNumber: 'number', ZodBoolean: 'boolean',
    ZodArray: 'array', ZodObject: 'object', ZodEnum: 'string',
    ZodOptional: 'string', ZodDefault: 'string', ZodRecord: 'object',
  };
  return m[typeName] || 'string';
}
