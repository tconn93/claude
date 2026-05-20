import { z } from 'zod';
import { createToolResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';

const enterPlanModeSchema = z.object({
  reason: z.string().optional().describe('Optional reason for entering plan mode'),
});

export const enterPlanModeTool: ToolDefinition = {
  name: 'EnterPlanMode',
  description: `Enter plan mode, where the assistant creates a detailed plan before executing code changes.

In plan mode, the assistant:
- Analyzes the request and explores the codebase
- Creates a structured implementation plan
- Presents the plan for user approval before making changes
- Does NOT make any code changes until the plan is approved`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(enterPlanModeSchema);
  },

  async execute(
    input: Record<string, unknown>,
    _context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = enterPlanModeSchema.parse(input);

    return createToolResult(
      `Entering plan mode. ${validated.reason ? `Reason: ${validated.reason}` : ''}`.trim(),
      false,
      { planMode: true, reason: validated.reason },
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
