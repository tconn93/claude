import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { taskStore } from './taskStore.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { TaskCreateInput } from './types.ts';

const taskCreateInputSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  assignedTo: z.string().optional().describe('Agent or person assigned to this task'),
  dependencies: z.array(z.string()).optional().describe('IDs of tasks this task depends on'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Additional metadata'),
});

export const taskCreateTool: ToolDefinition<TaskCreateInput> = {
  name: 'TaskCreate',
  description: `Create a new task in the task management system.

Usage:
- Tasks have a unique ID, title, description, and status
- Optional dependencies can link tasks together
- Tasks start in 'pending' status`,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(taskCreateInputSchema);
  },

  async execute(
    input: TaskCreateInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = taskCreateInputSchema.parse(input);

    const id = randomUUID();
    const now = Date.now();

    const task = {
      id,
      title: validated.title,
      description: validated.description,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
      assignedTo: validated.assignedTo,
      dependencies: validated.dependencies,
      metadata: validated.metadata,
    };

    taskStore.set(id, task);

    return createToolResult(
      `Task created: ${task.title} (ID: ${id})`,
      false,
      { task },
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
