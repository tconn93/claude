import type { ToolDefinition, ToolRegistry, ToolInputSchema } from './types/tool.ts';
import type { PermissionResult } from './types/permissions.ts';
import type { ToolUseContext } from './types/tool.ts';

import { bashTool } from './tools/BashTool/BashTool.ts';
import { fileReadTool } from './tools/FileReadTool/FileReadTool.ts';
import { fileWriteTool } from './tools/FileWriteTool/FileWriteTool.ts';
import { fileEditTool } from './tools/FileEditTool/FileEditTool.ts';
import { globTool } from './tools/GlobTool/GlobTool.ts';
import { grepTool } from './tools/GrepTool/GrepTool.ts';
import { webFetchTool } from './tools/WebFetchTool/WebFetchTool.ts';
import { webSearchTool } from './tools/WebSearchTool/WebSearchTool.ts';
import { taskCreateTool } from './tools/TaskTool/TaskCreateTool.ts';
import { taskListTool } from './tools/TaskTool/TaskListTool.ts';
import { taskGetTool } from './tools/TaskTool/TaskGetTool.ts';
import { taskUpdateTool } from './tools/TaskTool/TaskUpdateTool.ts';
import { todoWriteTool } from './tools/TodoWriteTool/TodoWriteTool.ts';
import { askUserQuestionTool } from './tools/AskUserQuestionTool/AskUserQuestionTool.ts';
import { agentTool } from './tools/AgentTool/AgentTool.ts';
import { skillTool } from './tools/SkillTool/SkillTool.ts';
import { enterPlanModeTool } from './tools/PlanModeTool/EnterPlanModeTool.ts';
import { exitPlanModeTool } from './tools/PlanModeTool/ExitPlanModeTool.ts';

class ToolRegistryImpl implements ToolRegistry {
  readonly tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
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
    const exact = this.tools.get(name);
    if (exact) return [exact];

    const lower = name.toLowerCase();
    return this.list().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
    );
  }

  findByPattern(pattern: string): ToolDefinition[] {
    try {
      const regex = new RegExp(pattern, 'i');
      return this.list().filter(t => regex.test(t.name) || regex.test(t.description));
    } catch {
      return [];
    }
  }

  getAllInputSchemas(): Record<string, ToolInputSchema> {
    const schemas: Record<string, ToolInputSchema> = {};
    for (const [name, tool] of this.tools) {
      schemas[name] = tool.inputSchema;
    }
    return schemas;
  }

  getReadOnlyTools(): ToolDefinition[] {
    return this.list().filter(t => t.isReadOnly);
  }
}

let registryInstance: ToolRegistryImpl | null = null;

export function getToolRegistry(): ToolRegistryImpl {
  if (!registryInstance) {
    registryInstance = new ToolRegistryImpl();
    registerAllTools(registryInstance);
  }
  return registryInstance;
}

export function resetToolRegistry(): void {
  registryInstance = null;
}

function registerAllTools(registry: ToolRegistryImpl): void {
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
  registry.register(agentTool);
  registry.register(skillTool);
  registry.register(enterPlanModeTool);
  registry.register(exitPlanModeTool);
}
