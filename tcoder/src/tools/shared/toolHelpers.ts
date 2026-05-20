import { existsSync, statSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, isAbsolute, dirname, normalize, relative } from 'node:path';
import type { ToolResult, ToolInputSchema } from '../../types/tool.ts';
import { FILE_SIZE_LIMIT } from '../../constants/common.ts';

export function resolvePath(baseDir: string, target: string): string {
  if (isAbsolute(target)) {
    return normalize(target);
  }
  return resolve(baseDir, target);
}

export function isWithinWorkspace(workspaceDir: string, targetPath: string): boolean {
  const resolved = resolvePath(workspaceDir, targetPath);
  const normalizedWorkspace = resolve(workspaceDir);
  return resolved.startsWith(normalizedWorkspace + '/') || resolved === normalizedWorkspace;
}

export function validatePath(path: string): string | null {
  if (!path || path.trim() === '') {
    return 'Path cannot be empty';
  }
  const normalized = normalize(path);
  if (normalized.includes('..')) {
    return 'Path traversal detected';
  }
  return null;
}

export function safeStat(filePath: string): {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
} | null {
  try {
    const stats = statSync(filePath);
    return {
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
    };
  } catch {
    return null;
  }
}

export function safeReadFile(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const stat = statSync(filePath);
    if (stat.size > FILE_SIZE_LIMIT) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function safeReadFileBytes(filePath: string): Buffer | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const stat = statSync(filePath);
    if (stat.size > FILE_SIZE_LIMIT) {
      return null;
    }
    return readFileSync(filePath);
  } catch {
    return null;
  }
}

export function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function createToolResult(content: string, isError = false, metadata?: Record<string, unknown>): ToolResult {
  return {
    content,
    isError,
    metadata,
  };
}

export function createErrorResult(message: string, metadata?: Record<string, unknown>): ToolResult {
  return {
    content: message,
    isError: true,
    metadata,
  };
}

export function zodToInputSchema(zodSchema: {
  _def?: unknown;
  shape?: Record<string, unknown>;
  keyof?: () => { options: string[] };
}): ToolInputSchema {
  const schema: ToolInputSchema = {
    type: 'object',
    properties: {} as Record<string, unknown>,
    required: [] as string[],
    additionalProperties: false,
  };

  try {
    type ZodType = {
      _def: {
        typeName: string;
        shape: () => Record<string, ZodType>;
        values?: string[];
      };
      description?: string;
      isOptional?: () => boolean;
      _type?: unknown;
    };

    const def = (zodSchema as unknown as ZodType)._def;
    if (def && def.shape) {
      const shape = def.shape();
      for (const [key, field] of Object.entries(shape)) {
        const fieldDef = (field as ZodType)._def;
        const property: Record<string, unknown> = {
          type: mapZodTypeToJsonType(fieldDef.typeName),
        };
        if ((field as ZodType).description) {
          property.description = (field as ZodType).description;
        }
        if (fieldDef.values) {
          property.enum = fieldDef.values;
        }
        schema.properties![key] = property;
      }
    }

    if ((zodSchema as unknown as ZodType)._def && typeof (zodSchema as unknown as { keyof?: () => { options: string[] } }).keyof === 'function') {
      schema.required = (zodSchema as unknown as { keyof: () => { options: string[] } }).keyof().options || [];
    }
  } catch {
    // Fallback: return basic schema
  }

  return schema;
}

function mapZodTypeToJsonType(zodType: string): string {
  const typeMap: Record<string, string> = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBoolean: 'boolean',
    ZodArray: 'array',
    ZodObject: 'object',
    ZodEnum: 'string',
    ZodOptional: 'string',
    ZodDefault: 'string',
  };
  return typeMap[zodType] || 'string';
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateContent(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  const truncated = lines.slice(0, maxLines).join('\n');
  return `${truncated}\n\n... (truncated ${lines.length - maxLines} more lines)`;
}

export function relativePath(workingDir: string, filePath: string): string {
  try {
    return relative(workingDir, filePath) || filePath;
  } catch {
    return filePath;
  }
}
