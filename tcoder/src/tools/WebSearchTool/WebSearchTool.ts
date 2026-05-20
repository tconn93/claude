import { z } from 'zod';
import { createToolResult, createErrorResult } from '../shared/toolHelpers.ts';
import type { ToolDefinition, ToolUseContext, ToolResult } from '../../types/tool.ts';
import type { WebSearchInput } from './types.ts';

const webSearchInputSchema = z.object({
  query: z.string().min(2).describe('The search query to use'),
  allowed_domains: z.array(z.string()).optional().describe('Only include search results from these domains'),
  blocked_domains: z.array(z.string()).optional().describe('Never include search results from these domains'),
  maxResults: z.number().min(1).max(20).optional().describe('Maximum number of results (default: 10)'),
});

interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  published?: string;
}

export const webSearchTool: ToolDefinition<WebSearchInput> = {
  name: 'WebSearch',
  description: `Search the web and return formatted results.

Usage notes:
  - Domain filtering is supported to include or block specific websites
  - Web search is only available in supported regions
  - Results include title, URL, and snippet for each item`,
  isReadOnly: true,
  isEnabled: () => true,
  canUse: () => ({ allowed: true }),

  get inputSchema() {
    return zodToInputSchema(webSearchInputSchema);
  },

  async execute(
    input: WebSearchInput,
    context: ToolUseContext,
    onProgress?: (progress: { type: string; data: Record<string, unknown>; timestamp: number }) => void,
  ): Promise<ToolResult> {
    const validated = webSearchInputSchema.parse(input);
    const maxResults = validated.maxResults || 10;

    onProgress?.({
      type: 'web_search',
      data: { query: validated.query, stage: 'searching' },
      timestamp: Date.now(),
    });

    try {
      const searchUrl = new URL('https://html.duckduckgo.com/html/');
      searchUrl.searchParams.set('q', validated.query);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      if (context.signal) {
        context.signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(searchUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'tcoder/0.1.0 (AI Coding Assistant)',
          'Accept': 'text/html,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return createErrorResult(`Search failed with status ${response.status}`);
      }

      const html = await response.text();
      const results = parseDuckDuckGoResults(html, maxResults);

      let filteredResults = results;

      if (validated.allowed_domains && validated.allowed_domains.length > 0) {
        filteredResults = results.filter((r) =>
          validated.allowed_domains!.some((d) => {
            try {
              return new URL(r.url).hostname.includes(d);
            } catch {
              return false;
            }
          }),
        );
      }

      if (validated.blocked_domains && validated.blocked_domains.length > 0) {
        filteredResults = filteredResults.filter((r) =>
          !validated.blocked_domains!.some((d) => {
            try {
              return new URL(r.url).hostname.includes(d);
            } catch {
              return false;
            }
          }),
        );
      }

      if (filteredResults.length === 0) {
        return createToolResult('No search results found for the query', false, {
          query: validated.query,
          count: 0,
        });
      }

      const output = formatSearchResults(filteredResults);

      onProgress?.({
        type: 'web_search',
        data: { query: validated.query, stage: 'complete', count: filteredResults.length },
        timestamp: Date.now(),
      });

      return createToolResult(output, false, {
        query: validated.query,
        count: filteredResults.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('abort')) {
        return createErrorResult('Search timed out', { query: validated.query });
      }
      return createErrorResult(`Search failed: ${message}`, { query: validated.query });
    }
  },

  renderResult(result: ToolResult) {
    if (result.isError) {
      return `Error: ${result.content}`;
    }
    return result.content;
  },

  renderProgress(progress) {
    if (progress.type === 'web_search') {
      const { query, stage } = progress.data;
      if (stage === 'searching') return `Searching: ${query}`;
      if (stage === 'complete') return `Search complete: ${query}`;
    }
    return 'Searching the web...';
  },
};

function parseDuckDuckGoResults(html: string, maxResults: number): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;

  const links: Array<{ url: string; title: string }> = [];
  let linkMatch;
  while ((linkMatch = resultRegex.exec(html)) !== null && links.length < maxResults) {
    const rawUrl = linkMatch[1];
    let title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    try {
      const url = new URL(rawUrl);
      const uddg = url.searchParams.get('uddg');
      links.push({ url: uddg ? decodeURIComponent(uddg) : rawUrl, title: title || 'Untitled' });
    } catch {
      links.push({ url: rawUrl, title: title || 'Untitled' });
    }
  }

  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
    snippets.push(snippetMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  for (let i = 0; i < Math.min(links.length, snippets.length); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] || '',
    });
  }

  return results;
}

function formatSearchResults(results: SearchResultItem[]): string {
  const lines: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    lines.push(`${i + 1}. **${r.title}**`);
    lines.push(`   ${r.url}`);
    if (r.snippet) {
      lines.push(`   ${r.snippet}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

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
