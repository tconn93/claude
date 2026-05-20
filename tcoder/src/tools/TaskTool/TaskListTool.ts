import { z } from 'zod';
import { createToolResult } from '../shared/toolHelpers.ts';
import { taskStore } from './taskStore.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { TaskListInput, TaskStatus } from './types.ts';

const taskListInputSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'blocked']).optional(),
  assignedTo: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const taskListTool: ToolDefinition<TaskListInput> = {
  name: 'TaskList',
  description: 'List all tasks, with optional filtering by status and assignee.',
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(taskListInputSchema);
  },

  async execute(
    input: TaskListInput,
    _context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = taskListInputSchema.parse(input);
    const tasks = taskStore.list({
      status: validated.status,
      assignedTo: validated.assignedTo,
      limit: validated.limit || 50,
    });

    if (tasks.length === 0) {
      return createToolResult('No tasks found', false, { count: 0 });
    }

    const lines: string[] = [];
    for (const task of tasks) {
      const statusIcon = getStatusIcon(task.status);
      lines.push(`${statusIcon} ${task.id}: ${task.title} [${task.status}]`);
      if (task.assignedTo) {
        lines.push(`     Assigned to: ${task.assignedTo}`);
      }
    }

    return createToolResult(lines.join('\n'), false, { tasks, count: tasks.length });
  },

  renderResult(result: ToolResult) {
    if (result.isError) return `Error: ${result.content}`;
    return result.content;
  },
};

function getStatusIcon(status: TaskStatus): string {
  const icons: Record<TaskStatus, string> = {
    pending: '○',
    in_progress: '◉',
    completed: '✓',
    failed: '✗',
    cancelled: '⊘',
    blocked: '⊠',
  };
  return icons[status] || '○';
}

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
