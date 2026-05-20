import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { z } from 'zod';
import pm from 'picomatch';
import ignore from 'ignore';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { MAX_SEARCH_RESULTS, FILE_SIZE_LIMIT } from '../../constants/common.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { GlobInput } from './types.ts';

const globInputSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z.string().optional().describe('The directory to search in (default: working directory)'),
  maxResults: z.number().min(1).max(500).optional().describe('Maximum number of results'),
  maxDepth: z.number().min(1).max(50).optional().describe('Maximum directory depth to search'),
});

function resolvePath(baseDir: string, targetPath?: string): string {
  if (!targetPath) return baseDir;
  if (isAbsolute(targetPath)) return targetPath;
  return resolve(baseDir, targetPath);
}

function loadIgnoreRules(searchDir: string) {
  const gitignorePath = join(searchDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    try {
      const content = readFileSync(gitignorePath, 'utf-8');
      return ignore().add(content);
    } catch {
      // ignore errors
    }
  }
  return null;
}

function walkDir(
  dir: string,
  searchDir: string,
  isMatch: (str: string) => boolean,
  results: string[],
  maxResults: number,
  maxDepth: number,
  currentDepth: number,
  ig: ReturnType<typeof ignore> | null,
): void {
  if (results.length >= maxResults || currentDepth > maxDepth) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) return;

    const fullPath = join(dir, entry);
    const relativePath = relative(searchDir, fullPath);

    if (ig) {
      const checkPath = relativePath + (statSync(fullPath).isDirectory() ? '/' : '');
      if (ig.ignores(checkPath)) continue;
    }

    let stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue;
    }

    if (stats.isDirectory()) {
      if (entry.startsWith('.') && entry !== '.') continue;
      walkDir(fullPath, searchDir, isMatch, results, maxResults, maxDepth, currentDepth + 1, ig);
    } else if (stats.isFile()) {
      if (stats.size > FILE_SIZE_LIMIT) continue;
      if (isMatch(relativePath)) {
        results.push(relativePath);
      }
    }
  }
}

export const globTool: ToolDefinition<GlobInput> = {
  name: 'Glob',
  description: `Find files matching a glob pattern. Returns relative file paths.

Usage:
- Supports standard glob patterns: *, **, ?, [abc], {a,b}
- Results are relative to the search path
- Respects .gitignore rules when present
- Maximum 500 results per search`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(globInputSchema);
  },

  async execute(
    input: GlobInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = globInputSchema.parse(input);
    const searchDir = resolvePath(context.workingDirectory, validated.path);
    const maxResults = validated.maxResults || MAX_SEARCH_RESULTS;
    const maxDepth = validated.maxDepth || 30;

    if (!existsSync(searchDir)) {
      return createErrorResult(`Directory not found: ${searchDir}`);
    }

    try {
      const isMatch = pm(validated.pattern, {
        dot: true,
        nocase: false,
        bash: true,
      });

      const ig = loadIgnoreRules(searchDir);
      const results: string[] = [];

      walkDir(searchDir, searchDir, isMatch, results, maxResults, maxDepth, 0, ig);

      if (results.length === 0) {
        return createToolResult('No files found matching the pattern', false, {
          pattern: validated.pattern,
          count: 0,
        });
      }

      const truncated = results.length >= maxResults;
      const output = results.join('\n') +
        (truncated ? `\n\n... (truncated, found at least ${results.length} results)` : '');

      return createToolResult(output, false, {
        pattern: validated.pattern,
        count: results.length,
        truncated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Glob search failed: ${message}`);
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
