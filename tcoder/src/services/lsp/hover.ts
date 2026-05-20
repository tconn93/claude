import type { LSPRange } from './client.ts';

export interface HoverContent {
  value: string;
  language?: string;
}

export type HoverContents =
  | { kind: 'markdown'; value: string }
  | { kind: 'plaintext'; value: string }
  | { kind: 'array'; value: Array<{ value: string; language?: string }> };

export interface HoverResult {
  contents: HoverContents;
  range?: LSPRange;
}

export function parseHoverResult(raw: unknown): HoverResult | null {
  if (!raw) return null;

  const data = raw as Record<string, unknown>;

  if (!data.contents) return null;

  return {
    contents: parseContents(data.contents),
    range: data.range as LSPRange | undefined,
  };
}

function parseContents(raw: unknown): HoverContents {
  if (typeof raw === 'string') {
    return { kind: 'plaintext', value: raw };
  }

  if (Array.isArray(raw)) {
    return {
      kind: 'array',
      value: raw.map((item) => {
        if (typeof item === 'string') return { value: item };
        const obj = item as Record<string, unknown>;
        return {
          value: (obj.value as string) ?? '',
          language: obj.language as string | undefined,
        };
      }),
    };
  }

  const obj = raw as Record<string, unknown>;
  const value = (obj.value as string) ?? '';
  const kind = obj.kind as string;

  if (kind === 'markdown') {
    return { kind: 'markdown', value };
  }

  return { kind: 'plaintext', value };
}

export function formatHoverResult(result: HoverResult): string {
  const contents = result.contents;

  switch (contents.kind) {
    case 'markdown':
      return contents.value;
    case 'plaintext':
      return contents.value;
    case 'array': {
      return contents.value
        .map((item) => {
          if (item.language) {
            return `\`\`\`${item.language}\n${item.value}\n\`\`\``;
          }
          return item.value;
        })
        .join('\n');
    }
    default:
      return '';
  }
}

export function extractHoverParts(result: HoverResult): string[] {
  const contents = result.contents;

  switch (contents.kind) {
    case 'markdown':
    case 'plaintext':
      return [contents.value];
    case 'array':
      return contents.value.map((item) => {
        if (item.language) {
          return `\`\`\`${item.language}\n${item.value}\n\`\`\``;
        }
        return item.value;
      });
    default:
      return [];
  }
}

export function hasCodeBlock(hover: HoverResult): boolean {
  if (hover.contents.kind === 'array') {
    return hover.contents.value.some((item) => !!item.language);
  }
  return hover.contents.value.includes('```');
}
