import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { taskStore } from './taskStore.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { TaskUpdateInput, TaskStatus } from './types.ts';

const taskUpdateInputSchema = z.object({
  id: z.string().describe('Task ID to update'),
  title: z.string().optional().describe('New task title'),
  description: z.string().optional().describe('New task description'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'blocked']).optional(),
  assignedTo: z.string().optional().describe('New assignee'),
  dependencies: z.array(z.string()).optional().describe('New dependency IDs'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Additional metadata to merge'),
});

export const taskUpdateTool: ToolDefinition<TaskUpdateInput> = {
  name: 'TaskUpdate',
  description: `Update an existing task's properties. Only provided fields are updated.

Usage:
- Use to change task status (pending -> in_progress -> completed)
- Can reassign tasks and update dependencies`,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(taskUpdateInputSchema);
  },

  async execute(
    input: TaskUpdateInput,
    _context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = taskUpdateInputSchema.parse(input);
    const existing = taskStore.get(validated.id);

    if (!existing) {
      return createErrorResult(`Task not found: ${validated.id}`);
    }

    const updated = {
      ...existing,
      title: validated.title !== undefined ? validated.title : existing.title,
      description: validated.description !== undefined ? validated.description : existing.description,
      status: (validated.status as TaskStatus) !== undefined ? (validated.status as TaskStatus) : existing.status,
      assignedTo: validated.assignedTo !== undefined ? validated.assignedTo : existing.assignedTo,
      dependencies: validated.dependencies !== undefined ? validated.dependencies : existing.dependencies,
      metadata: validated.metadata !== undefined
        ? { ...existing.metadata, ...validated.metadata }
        : existing.metadata,
      updatedAt: Date.now(),
    };

    taskStore.set(validated.id, updated);

    const changes: string[] = [];
    if (validated.title !== undefined) changes.push('title');
    if (validated.description !== undefined) changes.push('description');
    if (validated.status !== undefined) changes.push('status');
    if (validated.assignedTo !== undefined) changes.push('assignedTo');
    if (validated.dependencies !== undefined) changes.push('dependencies');

    return createToolResult(
      `Task updated: ${updated.title} (${changes.join(', ')})`,
      false,
      { task: updated, changes },
    );
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
