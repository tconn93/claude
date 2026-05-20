import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { FILE_WRITE_PROMPT } from './prompt.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { FileWriteInput } from './types.ts';

const fileWriteInputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to write (must be absolute, not relative)'),
  content: z.string().describe('The content to write to the file'),
  encoding: z.string().optional().describe('File encoding (default: utf-8)'),
});

function resolvePath(baseDir: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return resolve(baseDir, filePath);
}

export const fileWriteTool: ToolDefinition<FileWriteInput> = {
  name: 'Write',
  description: `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents.
- Prefer the Edit tool for modifying existing files -- it only sends the diff.
- Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.`,
  prompt: FILE_WRITE_PROMPT,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(fileWriteInputSchema);
  },

  needsPermissions: () => true,

  async execute(
    input: FileWriteInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = fileWriteInputSchema.parse(input);
    const filePath = resolvePath(context.workingDirectory, validated.file_path);

    try {
      const existed = existsSync(filePath);

      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const encoding = (validated.encoding as BufferEncoding) || 'utf-8';
      writeFileSync(filePath, validated.content, { encoding, flush: true });

      const action = existed ? 'updated' : 'created';
      const lineCount = validated.content.split('\n').length;
      const byteSize = Buffer.byteLength(validated.content, encoding);

      return createToolResult(`File ${action} successfully: ${filePath} (${lineCount} lines, ${byteSize} bytes)`, false, {
        filePath,
        action,
        lineCount,
        byteSize,
        existed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to write file: ${message}`);
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) {
      return `Error: ${result.content}`;
    }
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
    const prop: Record<string, unknown> = {
      type: mapZodName(def.typeName),
    };
    if (def.values) {
      prop.enum = def.values;
    }
    if (zodField.description) {
      prop.description = zodField.description;
    }
    result.properties[key] = prop;

    const fieldShape = schema._def.shape()[key] as z.ZodType & { isOptional?: () => boolean };
    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodDefault' || fieldShape?.isOptional?.()) {
      continue;
    }
    result.required.push(key);
  }

  return result;
}

function mapZodName(typeName: string): string {
  const m: Record<string, string> = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBoolean: 'boolean',
    ZodArray: 'array',
    ZodObject: 'object',
    ZodEnum: 'string',
    ZodOptional: 'string',
    ZodDefault: 'string',
    ZodRecord: 'object',
  };
  return m[typeName] || 'string';
}
