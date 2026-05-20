import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { taskStore } from './taskStore.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { TaskGetInput } from './types.ts';

const taskGetInputSchema = z.object({
  id: z.string().describe('Task ID'),
});

export const taskGetTool: ToolDefinition<TaskGetInput> = {
  name: 'TaskGet',
  description: 'Get details for a specific task by ID.',
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(taskGetInputSchema);
  },

  async execute(
    input: TaskGetInput,
    _context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = taskGetInputSchema.parse(input);
    const task = taskStore.get(validated.id);

    if (!task) {
      return createErrorResult(`Task not found: ${validated.id}`);
    }

    const lines = [
      `Task: ${task.title}`,
      `ID: ${task.id}`,
      `Status: ${task.status}`,
      `Created: ${new Date(task.createdAt).toISOString()}`,
      `Updated: ${new Date(task.updatedAt).toISOString()}`,
    ];

    if (task.description) {
      lines.push(`Description: ${task.description}`);
    }
    if (task.assignedTo) {
      lines.push(`Assigned to: ${task.assignedTo}`);
    }
    if (task.dependencies && task.dependencies.length > 0) {
      lines.push(`Dependencies: ${task.dependencies.join(', ')}`);
    }

    return createToolResult(lines.join('\n'), false, { task });
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
