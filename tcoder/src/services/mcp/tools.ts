import type { ToolDefinition, ToolInputSchema } from '../../types/tool.ts';
import type { MCPTool, MCPServerConfig } from './types.ts';

export interface MCPToolAdapter {
  originalTool: MCPTool;
  adaptedDefinition: ToolDefinition;
  serverName: string;
}

export function adaptMCPToolToTcoder(tool: MCPTool): MCPToolAdapter {
  const definition: ToolDefinition = {
    name: `mcp__${tool.serverName}__${tool.name}`,
    description: `[MCP: ${tool.serverName}] ${tool.description}`,
    inputSchema: tool.inputSchema,
    isEnabled: () => true,
    isReadOnly: false,
    canUse: () => ({ allowed: true }),
    execute: async (input, context) => {
      return {
        content: `MCP tool '${tool.name}' called with: ${JSON.stringify(input)}`,
        metadata: { serverName: tool.serverName, toolName: tool.name },
      };
    },
  };

  return {
    originalTool: tool,
    adaptedDefinition: definition,
    serverName: tool.serverName,
  };
}

export function createMCPToolSchema(tool: MCPTool): ToolInputSchema {
  return tool.inputSchema;
}

export function formatMCPToolName(serverName: string, toolName: string): string {
  return `mcp__${serverName}__${toolName}`;
}

export function parseMCPToolName(formattedName: string): { serverName: string; toolName: string } | null {
  const match = formattedName.match(/^mcp__([^_]+)__(.+)$/);
  if (!match) return null;
  return {
    serverName: match[1],
    toolName: match[2],
  };
}

export function groupToolsByServer(tools: MCPTool[]): Map<string, MCPTool[]> {
  const groups = new Map<string, MCPTool[]>();
  for (const tool of tools) {
    const serverName = tool.serverName;
    const group = groups.get(serverName) ?? [];
    group.push(tool);
    groups.set(serverName, group);
  }
  return groups;
}

export function filterToolsByPattern(tools: MCPTool[], pattern: string): MCPTool[] {
  const lower = pattern.toLowerCase();
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.serverName.toLowerCase().includes(lower),
  );
}

export function mergeToolLists(lists: MCPTool[][]): MCPTool[] {
  const seen = new Set<string>();
  const merged: MCPTool[] = [];

  for (const list of lists) {
    for (const tool of list) {
      const key = `${tool.serverName}:${tool.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(tool);
      }
    }
  }

  return merged;
}
