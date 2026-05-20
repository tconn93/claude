import { z } from 'zod';
import { createToolResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';

const exitPlanModeSchema = z.object({
  plan_result: z.string().describe('Summary of the plan results and agreed approach'),
});

export const exitPlanModeTool: ToolDefinition = {
  name: 'ExitPlanMode',
  description: `Exit plan mode with a summary of the approved plan. After exiting, the assistant can begin implementing the plan.`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(exitPlanModeSchema);
  },

  async execute(
    input: Record<string, unknown>,
    _context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = exitPlanModeSchema.parse(input);

    return createToolResult(
      `Exiting plan mode. Plan summary: ${validated.plan_result}`,
      false,
      { planMode: false, planResult: validated.plan_result },
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
