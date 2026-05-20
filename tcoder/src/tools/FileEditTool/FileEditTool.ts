import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { FILE_EDIT_PROMPT } from './prompt.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { FileEditInput } from './types.ts';

const fileEditInputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to modify'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
  replace_all: z.boolean().optional().describe('Replace all occurrences of old_string (default false)'),
  dry_run: z.boolean().optional().describe('Preview changes without applying them'),
});

function resolvePath(baseDir: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return resolve(baseDir, filePath);
}

function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}

export const fileEditTool: ToolDefinition<FileEditInput> = {
  name: 'Edit',
  description: `Performs exact string replacements in files.

Usage:
- You must use your Read tool at least once in the conversation before editing.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix.
- The edit will FAIL if old_string is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use replace_all to change every instance of old_string.
- Use replace_all for replacing and renaming strings across the file.`,
  prompt: FILE_EDIT_PROMPT,
  isReadOnly: false,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(fileEditInputSchema);
  },

  needsPermissions: () => true,

  async execute(
    input: FileEditInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = fileEditInputSchema.parse(input);
    const filePath = resolvePath(context.workingDirectory, validated.file_path);

    if (validated.old_string === validated.new_string) {
      return createErrorResult('old_string and new_string must be different');
    }

    if (!existsSync(filePath)) {
      return createErrorResult(`File not found: ${filePath}`);
    }

    try {
      const originalContent = readFileSync(filePath, 'utf-8');
      const replaceAll = validated.replace_all || false;
      const occurrences = countOccurrences(originalContent, validated.old_string);

      if (occurrences === 0) {
        return createErrorResult(
          `old_string not found in file. Make sure the string matches exactly, including whitespace and indentation.`,
          { filePath },
        );
      }

      if (occurrences > 1 && !replaceAll) {
        return createErrorResult(
          `old_string is not unique in the file (found ${occurrences} occurrences). Use replace_all to replace all instances, or provide a larger string with more surrounding context to make it unique.`,
          { filePath, occurrences },
        );
      }

      const newContent = replaceAll
        ? originalContent.replaceAll(validated.old_string, validated.new_string)
        : originalContent.replace(validated.old_string, validated.new_string);

      if (validated.dry_run) {
        const changes = replaceAll ? occurrences : 1;
        return createToolResult(
          `DRY RUN: Would replace ${changes} occurrence(s) in ${filePath}`,
          false,
          {
            filePath,
            dryRun: true,
            changes,
          },
        );
      }

      writeFileSync(filePath, newContent, 'utf-8');
      const changes = replaceAll ? occurrences : 1;

      return createToolResult(
        `Successfully edited ${filePath}: ${changes} replacement(s) made.`,
        false,
        {
          filePath,
          changes,
          bytesChanged: Buffer.byteLength(newContent, 'utf-8') - Buffer.byteLength(originalContent, 'utf-8'),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to edit file: ${message}`);
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
