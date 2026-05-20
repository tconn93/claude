import { readFileSync, statSync, existsSync } from 'node:fs';
import { extname, resolve, isAbsolute } from 'node:path';
import { z } from 'zod';
import { createToolResult, createErrorResult, truncateContent } from '../shared/toolHelpers.ts';
import { FILE_READ_PROMPT } from './prompt.ts';
import { MAX_FILE_LINES } from '../../constants/common.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { FileReadInput } from './types.ts';

const fileReadInputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z.number().min(0).optional().describe('The line number to start reading from'),
  limit: z.number().min(1).optional().describe('The number of lines to read'),
  encoding: z.string().optional().describe('File encoding (default: utf-8)'),
});

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.txt', '.md', '.mdx',
  '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.sql', '.graphql', '.gql',
  '.proto', '.thrift',
  '.vue', '.svelte', '.astro',
  '.prisma',
  '.gitignore', '.dockerignore', '.editorconfig',
  'Dockerfile', 'Makefile', 'CMakeLists.txt',
]);

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico', '.svg',
  '.tiff', '.tif', '.avif', '.heic', '.heif',
]);

const PDF_EXTENSION = '.pdf';

function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function isPdfFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === PDF_EXTENSION;
}

function isLikelyText(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (IMAGE_EXTENSIONS.has(ext)) return false;
  if (ext === PDF_EXTENSION) return false;
  return true;
}

function resolvePath(baseDir: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return resolve(baseDir, filePath);
}

export const fileReadTool: ToolDefinition<FileReadInput> = {
  name: 'Read',
  description: `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- When you already know which part of the file you need, only read that part. This can be important for larger files.
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually.
- This tool can read PDF files (.pdf). For large PDFs (more than 10 pages), you MUST provide the pages parameter.
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs.
- This tool can only read files, not directories.`,
  prompt: FILE_READ_PROMPT,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(fileReadInputSchema);
  },

  async execute(
    input: FileReadInput,
    context: ToolUseContext,
  ): Promise<ToolResult> {
    const validated = fileReadInputSchema.parse(input);
    const filePath = resolvePath(context.workingDirectory, validated.file_path);

    if (!existsSync(filePath)) {
      return createErrorResult(`File not found: ${filePath}`);
    }

    try {
      const stats = statSync(filePath);

      if (stats.isDirectory()) {
        return createErrorResult(`Path is a directory, not a file: ${filePath}`);
      }

      const mimeType = isImageFile(filePath) ? `image/${extname(filePath).slice(1)}` :
        isPdfFile(filePath) ? 'application/pdf' : 'text/plain';

      const isBinary = !isLikelyText(filePath);

      if (isBinary) {
        if (isImageFile(filePath)) {
          try {
            const content = readFileSync(filePath, 'base64');
            return createToolResult(content, false, {
              filePath,
              fileSize: stats.size,
              mimeType,
              isBinary: true,
              isImage: true,
            });
          } catch {
            return createErrorResult(`Failed to read image file: ${filePath}`);
          }
        }

        if (isPdfFile(filePath)) {
          return createToolResult(`[PDF file: ${filePath} (${stats.size} bytes)]`, false, {
            filePath,
            fileSize: stats.size,
            mimeType: 'application/pdf',
            isPdf: true,
          });
        }

        return createErrorResult(`Cannot read binary file: ${filePath}`, {
          filePath,
          fileSize: stats.size,
          mimeType: 'application/octet-stream',
          isBinary: true,
        });
      }

      const encoding = (validated.encoding as BufferEncoding) || 'utf-8';
      const rawContent = readFileSync(filePath, { encoding });
      const lines = rawContent.split('\n');
      const totalLines = lines.length;

      const offset = validated.offset || 0;
      const limit = validated.limit || MAX_FILE_LINES;

      if (offset >= totalLines) {
        return createToolResult('', false, {
          filePath,
          totalLines,
          linesRead: 0,
          offset,
          fileSize: stats.size,
          mimeType,
        });
      }

      const selectedLines = lines.slice(offset, offset + limit);
      let output = selectedLines
        .map((line: string, i: number) => {
          const lineNum = offset + i + 1;
          const numStr = String(lineNum);
          return `${numStr}\t${line}`;
        })
        .join('\n');

      if (offset + limit < totalLines) {
        output += `\n\n... (${totalLines - (offset + limit)} more lines)`;
      }

      return createToolResult(output, false, {
        filePath,
        totalLines,
        linesRead: selectedLines.length,
        offset,
        fileSize: stats.size,
        mimeType,
        isBinary: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(`Failed to read file: ${message}`);
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
