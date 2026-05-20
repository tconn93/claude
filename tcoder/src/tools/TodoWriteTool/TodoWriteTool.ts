import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { TodoWriteInput, TodoItem } from './types.ts';

const todoWriteInputSchema = z.object({
  todos: z.array(z.object({
    id: z.string().describe('Unique identifier for the todo item'),
    text: z.string().describe('Description of the todo item'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dependsOn: z.array(z.string()).optional(),
  })),
});

const todosStore = new Map<string, Map<string, TodoItem>>();

function getSessionTodos(sessionId: string): Map<string, TodoItem> {
  if (!todosStore.has(sessionId)) {
    todosStore.set(sessionId, new Map());
  }
  return todosStore.get(sessionId)!;
}

export const todoWriteTool: ToolDefinition<TodoWriteInput> = {
  name: 'TodoWrite',
  description: `Create and manage a structured task list for your current coding session. This helps track progress, organize complex tasks, and demonstrate thoroughness.

Usage:
- Use this tool to create and update a list of todos for your current session
- Each todo has an ID, text, status (pending/in_progress/completed/cancelled), and optional priority
- Update status in real time - mark complete immediately after finishing a step
- The entire todo list is replaced on each call, so include ALL todos
- Use dependencies to indicate task ordering`,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(todoWriteInputSchema);
  },

  async execute(
    input: TodoWriteInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = todoWriteInputSchema.parse(input);

    if (validated.todos.length === 0) {
      return createErrorResult('Todo list must contain at least one item');
    }

    const sessionTodos = getSessionTodos(context.sessionId);
    const now = Date.now();
    const created: TodoItem[] = [];

    sessionTodos.clear();

    for (const item of validated.todos) {
      const todo: TodoItem = {
        id: item.id,
        text: item.text,
        status: item.status,
        priority: item.priority,
        dependsOn: item.dependsOn,
        createdAt: now,
        updatedAt: now,
      };
      sessionTodos.set(item.id, todo);
      created.push(todo);
    }

    const completed = created.filter((t) => t.status === 'completed').length;
    const inProgress = created.filter((t) => t.status === 'in_progress').length;
    const pending = created.filter((t) => t.status === 'pending').length;

    const summary = `Todo list updated: ${created.length} items (${pending} pending, ${inProgress} in progress, ${completed} completed)`;

    return createToolResult(summary, false, {
      todos: created,
      counts: { total: created.length, pending, in_progress: inProgress, completed },
    });
  },

  renderResult(result: ToolResult) {
    if (result.isError) return `Error: ${result.content}`;
    return result.content;
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
