import type { ToolDefinition, ToolRegistry, ToolInputSchema, ToolUseContext, ToolResult } from '../types/tool.ts';

import { bashTool } from './BashTool/BashTool.ts';
import { fileReadTool } from './FileReadTool/FileReadTool.ts';
import { fileWriteTool } from './FileWriteTool/FileWriteTool.ts';
import { fileEditTool } from './FileEditTool/FileEditTool.ts';
import { globTool } from './GlobTool/GlobTool.ts';
import { grepTool } from './GrepTool/GrepTool.ts';
import { webFetchTool } from './WebFetchTool/WebFetchTool.ts';
import { webSearchTool } from './WebSearchTool/WebSearchTool.ts';
import { taskCreateTool } from './TaskTool/TaskCreateTool.ts';
import { taskListTool } from './TaskTool/TaskListTool.ts';
import { taskGetTool } from './TaskTool/TaskGetTool.ts';
import { taskUpdateTool } from './TaskTool/TaskUpdateTool.ts';
import { todoWriteTool } from './TodoWriteTool/TodoWriteTool.ts';
import { askUserQuestionTool } from './AskUserQuestionTool/AskUserQuestionTool.ts';
import { enterPlanModeTool } from './PlanModeTool/EnterPlanModeTool.ts';
import { exitPlanModeTool } from './PlanModeTool/ExitPlanModeTool.ts';
import { skillTool } from './SkillTool/SkillTool.ts';
import { agentTool } from './AgentTool/AgentTool.ts';
import { mcpTool, registerMCPServer, unregisterMCPServer, getMCPServers } from './MCPTool/MCPTool.ts';

export class ToolRegistryImpl implements ToolRegistry {
  tools: Map<string, ToolDefinition>;

  constructor() {
    this.tools = new Map();
  }

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  match(name: string): ToolDefinition[] {
    const results: ToolDefinition[] = [];
    const lower = name.toLowerCase();

    for (const [toolName, tool] of this.tools) {
      if (toolName.toLowerCase().includes(lower)) {
        results.push(tool);
      }
    }

    return results;
  }

  findByPattern(pattern: string): ToolDefinition[] {
    const results: ToolDefinition[] = [];

    try {
      const regex = new RegExp(pattern, 'i');
      for (const [toolName, tool] of this.tools) {
        if (regex.test(toolName)) {
          results.push(tool);
        }
      }
    } catch {
      return [];
    }

    return results;
  }

  getAllInputSchemas(): Record<string, ToolInputSchema> {
    const schemas: Record<string, ToolInputSchema> = {};

    for (const [name, tool] of this.tools) {
      schemas[name] = tool.inputSchema;
    }

    return schemas;
  }

  getReadOnlyTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.isReadOnly);
  }

  getWriteTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => !t.isReadOnly);
  }

  getEnabledTools(context: ToolUseContext): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.isEnabled(context));
  }

  async getToolResult(
    name: string,
    input: Record<string, unknown>,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: `Unknown tool: ${name}`,
        isError: true,
      };
    }

    try {
      const permission = await tool.canUse(context);
      if (!permission.allowed) {
        return {
          content: `Permission denied for tool "${name}": ${permission.reason}`,
          isError: true,
        };
      }

      return await tool.execute(input, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: `Tool execution failed: ${message}`,
        isError: true,
      };
    }
  }
}

let registry: ToolRegistryImpl | null = null;

export function getToolRegistry(): ToolRegistryImpl {
  if (registry) return registry;

  registry = new ToolRegistryImpl();

  registry.register(bashTool);
  registry.register(fileReadTool);
  registry.register(fileWriteTool);
  registry.register(fileEditTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(webFetchTool);
  registry.register(webSearchTool);
  registry.register(taskCreateTool);
  registry.register(taskListTool);
  registry.register(taskGetTool);
  registry.register(taskUpdateTool);
  registry.register(todoWriteTool);
  registry.register(askUserQuestionTool);
  registry.register(enterPlanModeTool);
  registry.register(exitPlanModeTool);
  registry.register(skillTool);
  registry.register(agentTool);
  registry.register(mcpTool);

  return registry;
}

export function resetToolRegistry(): void {
  registry = null;
}

export {
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileEditTool,
  globTool,
  grepTool,
  webFetchTool,
  webSearchTool,
  taskCreateTool,
  taskListTool,
  taskGetTool,
  taskUpdateTool,
  todoWriteTool,
  askUserQuestionTool,
  enterPlanModeTool,
  exitPlanModeTool,
  skillTool,
  agentTool,
  mcpTool,
  registerMCPServer,
  unregisterMCPServer,
  getMCPServers,
};

export type { ToolDefinition, ToolRegistry, ToolInputSchema, ToolUseContext, ToolResult };
