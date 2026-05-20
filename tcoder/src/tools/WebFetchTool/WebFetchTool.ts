import { z } from 'zod';
import { marked } from 'marked';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { WebFetchInput } from './types.ts';

const webFetchInputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  prompt: z.string().optional().describe('The prompt to run on the fetched content'),
  timeout: z.number().min(1000).max(30000).optional().describe('Request timeout in milliseconds (default: 10000)'),
});

const fetchCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL_MS = 900_000; // 15 minutes

function getCached(url: string): string | null {
  const entry = fetchCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    fetchCache.delete(url);
    return null;
  }
  return entry.content;
}

function setCache(url: string, content: string): void {
  fetchCache.set(url, { content, timestamp: Date.now() });

  if (fetchCache.size > 100) {
    const oldestKey = fetchCache.keys().next().value;
    if (oldestKey) fetchCache.delete(oldestKey);
  }
}

function htmlToMarkdown(html: string): string {
  try {
    const result = marked.parse(html, { async: false });
    if (typeof result === 'string') return result;
    return html;
  } catch {
    return html;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n... (content truncated)';
}

export const webFetchTool: ToolDefinition<WebFetchInput> = {
  name: 'WebFetch',
  description: `Fetches content from a specified URL and returns it as markdown or plain text.

Usage notes:
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning 15-minute cache for faster responses`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(webFetchInputSchema);
  },

  async execute(
    input: WebFetchInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = webFetchInputSchema.parse(input);
    let url = validated.url;

    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }

    const cached = getCached(url);
    if (cached) {
      onProgress?.({
        type: 'web_fetch',
        data: { url, stage: 'cache_hit' },
        timestamp: Date.now(),
      });
      return createToolResult(cached, false, { url, cached: true });
    }

    onProgress?.({
      type: 'web_fetch',
      data: { url, stage: 'fetching' },
      timestamp: Date.now(),
    });

    const timeout = validated.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (context.signal) {
      context.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'tcoder/0.1.0 (AI Coding Assistant)',
          'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
        },
      });

      if (!response.ok) {
        return createErrorResult(`HTTP ${response.status}: ${response.statusText}`, { url, status: response.status });
      }

      const contentType = response.headers.get('content-type') || '';
      let content: string;

      if (contentType.includes('text/html')) {
        const html = await response.text();
        content = htmlToMarkdown(html);
      } else if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
      }

      const maxContentLength = 50_000;
      content = truncateText(content, maxContentLength);

      setCache(url, content);

      onProgress?.({
        type: 'web_fetch',
        data: { url, stage: 'complete', contentLength: content.length },
        timestamp: Date.now(),
      });

      return createToolResult(content, false, {
        url,
        contentLength: content.length,
        contentType,
        truncated: content.length >= maxContentLength,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('abort')) {
        return createErrorResult(`Request timed out after ${timeout}ms`, { url, timeout });
      }
      return createErrorResult(`Failed to fetch URL: ${message}`, { url });
    } finally {
      clearTimeout(timeoutId);
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) {
      return `Error: ${result.content}`;
    }
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'web_fetch') {
      const { url, stage } = progress.data;
      if (stage === 'cache_hit') return `Loading from cache: ${url}`;
      if (stage === 'fetching') return `Fetching: ${url}`;
      if (stage === 'complete') return `Fetched: ${url}`;
    }
    return 'Fetching web content...';
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
