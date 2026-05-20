import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, extname } from 'node:path';
import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import { MAX_SEARCH_RESULTS } from '../../constants/common.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { GrepInput } from './types.ts';

const grepInputSchema = z.object({
  pattern: z.string().describe('The search pattern (regex)'),
  path: z.string().optional().describe('The directory to search in (default: working directory)'),
  include: z.string().optional().describe('File pattern to include (e.g., "*.ts")'),
  exclude: z.string().optional().describe('File pattern to exclude (e.g., "*.test.ts")'),
  maxResults: z.number().min(1).max(200).optional().describe('Maximum number of results'),
  contextBefore: z.number().min(0).max(10).optional().describe('Lines to show before each match'),
  contextAfter: z.number().min(0).max(10).optional().describe('Lines to show after each match'),
  maxFileSize: z.number().optional().describe('Maximum file size in bytes to search'),
  ignoreCase: z.boolean().optional().describe('Perform case-insensitive search'),
});

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.wasm',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.webm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.o', '.obj', '.class', '.pyc',
]);

function resolvePath(baseDir: string, targetPath?: string): string {
  if (!targetPath) return baseDir;
  if (isAbsolute(targetPath)) return targetPath;
  return resolve(baseDir, targetPath);
}

function isSearchableFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return false;
  return true;
}

interface SearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context: string[];
}

function searchFile(
  filePath: string,
  regex: RegExp,
  searchDir: string,
  contextBefore: number,
  contextAfter: number,
  maxFileSize: number,
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  try {
    const stat = statSync(filePath);
    if (stat.size > maxFileSize) return matches;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = regex.exec(line);

      if (match) {
        const contextLines: string[] = [];

        if (contextBefore > 0) {
          const start = Math.max(0, i - contextBefore);
          for (let j = start; j < i; j++) {
            contextLines.push(lines[j]);
          }
        }
        if (contextAfter > 0) {
          const end = Math.min(lines.length, i + contextAfter + 1);
          for (let j = i + 1; j < end; j++) {
            contextLines.push(lines[j]);
          }
        }

        matches.push({
          file: relative(searchDir, filePath),
          line: i + 1,
          column: match.index + 1,
          content: line,
          context: contextLines,
        });
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return matches;
}

function walkForSearch(
  dir: string,
  searchDir: string,
  regex: RegExp,
  results: SearchMatch[],
  maxResults: number,
  contextBefore: number,
  contextAfter: number,
  maxFileSize: number,
  depth: number,
): void {
  if (results.length >= maxResults || depth > 30) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) return;

    const fullPath = join(dir, entry);

    if (entry.startsWith('.') && entry !== '.') continue;
    if (entry === 'node_modules') continue;

    let fileStat;
    try {
      fileStat = statSync(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      walkForSearch(fullPath, searchDir, regex, results, maxResults, contextBefore, contextAfter, maxFileSize, depth + 1);
    } else if (fileStat.isFile() && isSearchableFile(fullPath)) {
      const fileMatches = searchFile(fullPath, regex, searchDir, contextBefore, contextAfter, maxFileSize);
      results.push(...fileMatches);
    }
  }
}

export const grepTool: ToolDefinition<GrepInput> = {
  name: 'Grep',
  description: `Search for text patterns in files. Returns matching lines with file locations.

Usage:
- The pattern can be a regex or literal string
- Searches all text files in the given directory recursively
- Skips binary files, hidden directories, and node_modules
- Use include/exclude patterns to filter which files are searched
- Context lines provide surrounding code for each match`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(grepInputSchema);
  },

  async execute(
    input: GrepInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = grepInputSchema.parse(input);
    const searchDir = resolvePath(context.workingDirectory, validated.path);
    const maxResults = validated.maxResults || MAX_SEARCH_RESULTS;
    const contextBefore = validated.contextBefore || 0;
    const contextAfter = validated.contextAfter || 0;
    const maxFileSize = validated.maxFileSize || 1024 * 1024; // 1MB default
    const ignoreCase = validated.ignoreCase || false;

    if (!existsSync(searchDir)) {
      return createErrorResult(`Directory not found: ${searchDir}`);
    }

    try {
      let regex: RegExp;
      try {
        regex = new RegExp(validated.pattern, ignoreCase ? 'gi' : 'g');
      } catch {
        return createErrorResult(`Invalid regex pattern: ${validated.pattern}`);
      }

      const results: SearchMatch[] = [];
      walkForSearch(searchDir, searchDir, regex, results, maxResults, contextBefore, contextAfter, maxFileSize, 0);

      if (results.length === 0) {
        return createToolResult('No matches found', false, {
          pattern: validated.pattern,
          count: 0,
        });
      }

      const truncated = results.length >= maxResults;
      const outputLines: string[] = [];
      let currentFile = '';

      for (const match of results) {
        if (match.file !== currentFile) {
          if (currentFile) outputLines.push('');
          outputLines.push(`${match.file}:`);
          currentFile = match.file;
        }
        outputLines.push(`  ${match.line}: ${match.content}`);
        for (const ctxLine of match.context) {
          outputLines.push(`    | ${ctxLine}`);
        }
      }

      if (truncated) {
        outputLines.push(`\n... (truncated, found at least ${results.length} results)`);
      }

      return createToolResult(outputLines.join('\n'), false, {
        pattern: validated.pattern,
        count: results.length,
        truncated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Search failed: ${message}`);
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
