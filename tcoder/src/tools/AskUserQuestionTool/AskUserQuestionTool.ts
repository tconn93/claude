import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { AskUserQuestionInput } from './types.ts';

const askUserQuestionInputSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('The question to ask the user'),
    header: z.string().optional().describe('Header text shown above the question'),
    multiSelect: z.boolean().optional().describe('Whether multiple options can be selected'),
    options: z.array(z.object({
      label: z.string().describe('Display label for this option'),
      description: z.string().optional().describe('Additional description for this option'),
    })).min(1).max(10),
  })).min(1).max(5),
  preview: z.boolean().optional().describe('Preview the questions without sending them'),
});

export const askUserQuestionTool: ToolDefinition<AskUserQuestionInput> = {
  name: 'AskUserQuestion',
  description: `Ask the user one or more questions to gather information needed to complete a task.

Usage:
- Use for clarifying requirements, confirming decisions, or gathering preferences
- Questions support both single-select and multi-select modes
- Each question can have up to 10 options
- Preview mode shows questions without displaying to the user
- Ask no more than 5 questions at a time`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(askUserQuestionInputSchema);
  },

  needsPermissions: () => true,

  async execute(
    input: AskUserQuestionInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = askUserQuestionInputSchema.parse(input);

    if (validated.preview) {
      const preview = validated.questions.map((q) => {
        const lines = [
          `Q: ${q.question}`,
          ...q.options.map((o) => `  - ${o.label}${o.description ? `: ${o.description}` : ''}`),
        ];
        if (q.multiSelect) lines.push('  [multi-select]');
        return lines.join('\n');
      }).join('\n\n');

      return createToolResult(`[Preview]\n\n${preview}`, false, { preview: true, questions: validated.questions });
    }

    const formatted = validated.questions.map((q, i) => {
      const lines = [
        `## Question ${i + 1}`,
        q.header ? `### ${q.header}` : '',
        q.question,
        q.multiSelect ? ' (Select all that apply)' : '',
        '',
        ...q.options.map((o, j) => `${j + 1}. ${o.label}${o.description ? ` - ${o.description}` : ''}`),
      ].filter(Boolean);
      return lines.join('\n');
    }).join('\n\n---\n\n');

    return createToolResult(formatted, false, {
      questions: validated.questions,
      pending: true,
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
