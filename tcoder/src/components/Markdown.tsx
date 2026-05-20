import React, { type ReactElement } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { Text } from './ui/Text.tsx';
import { Box } from './ui/Box.tsx';
import { Flex } from './ui/Flex.tsx';
import { Divider } from './ui/Divider.tsx';

export interface MarkdownProps {
  content: string;
}

function highlightCode(code: string, language?: string): string {
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

interface ParsedToken {
  type: string;
  raw?: string;
  text?: string;
  tokens?: ParsedToken[];
  lang?: string;
  depth?: number;
  ordered?: boolean;
  items?: ParsedToken[];
  header?: ParsedToken[];
  rows?: ParsedToken[][];
  align?: (string | null)[];
}

function renderToken(token: ParsedToken, index: number): ReactElement {
  switch (token.type) {
    case 'heading': {
      const level = token.depth ?? 1;
      const content = token.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join('') ?? '';
      const prefix = level === 1 ? '══ ' : level === 2 ? '── ' : '';
      const suffix = level === 1 ? ' ══' : '';
      return React.createElement(Text, {
        key: index,
        bold: true,
        underline: level <= 2,
      }, `${prefix}${content}${suffix}`);
    }

    case 'paragraph': {
      const text = token.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join('') ?? '';
      return React.createElement(Text, { key: index }, text);
    }

    case 'code': {
      const code = token.text ?? '';
      const lang = token.lang;
      let rendered = code;

      if (lang) {
        try {
          rendered = highlightCode(code, lang);
        } catch {
          // use raw code
        }
      }

      const lines = rendered.split('\n');
      const borderColor = '#4a4a5e';

      return React.createElement(
        Box,
        { key: index, border: 'single', borderColor, padding: 1 },
        React.createElement(Flex, { flexDirection: 'column', gap: 0 },
          ...lines.map((line: string, i: number) =>
            React.createElement(Text, { key: i, color: '#cacade' }, stripTags(line) || ' '),
          ),
        ),
      );
    }

    case 'blockquote': {
      const text = token.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join('\n') ?? '';
      const lines = text.split('\n');
      return React.createElement(Flex, { key: index, flexDirection: 'column', gap: 0 },
        ...lines.map((line, i) =>
          React.createElement(Text, { key: i, dim: true, italic: true }, `  ${line}`),
        ),
      );
    }

    case 'list': {
      const items = token.items ?? [];
      const isOrdered = token.ordered ?? false;
      return React.createElement(Flex, { key: index, flexDirection: 'column', gap: 0 },
        ...items.map((item, i) =>
          renderToken({ ...item, type: 'list_item', ordered: isOrdered, depth: i }, i),
        ),
      );
    }

    case 'list_item': {
      const text = token.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join(' ') ?? '';
      const marker = (token as Record<string, unknown>).ordered ? `${(token.depth ?? 0) + 1}.` : '•';
      return React.createElement(Flex, { key: index, flexDirection: 'row', gap: 1 },
        React.createElement(Text, { dim: true }, marker),
        React.createElement(Text, null, text),
      );
    }

    case 'table': {
      const headers = token.header?.map((h) =>
        h.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join('') ?? '',
      ) ?? [];
      const rows = token.rows ?? [];

      return React.createElement(
        Box,
        { key: index, border: 'single', borderColor: '#4a4a5e', padding: 0 },
        React.createElement(Flex, { flexDirection: 'column', gap: 0 },
          // header row
          headers.length > 0
            ? React.createElement(Flex, { flexDirection: 'row', gap: 2 },
                ...headers.map((h, i) =>
                  React.createElement(Text, { key: `h-${i}`, bold: true, color: '#3b82f6' }, h.padEnd(16)),
                ),
              )
            : null,
          // separator
          headers.length > 0 ? React.createElement(Divider, { char: '─', color: '#4a4a5e' }) : null,
          // data rows
          ...rows.map((row, ri) =>
            React.createElement(Flex, { key: `r-${ri}`, flexDirection: 'row', gap: 2 },
              ...row.map((cell, ci) => {
                const cellText = cell.tokens?.map((t) => stripTags(t.raw ?? t.text ?? '')).join('') ?? '';
                return React.createElement(Text, { key: `c-${ci}` }, cellText.padEnd(16));
              }),
            ),
          ),
        ),
      );
    }

    case 'hr': {
      return React.createElement(Divider, { key: index, char: '─' });
    }

    case 'space': {
      return React.createElement('text', { key: index }, ' ');
    }

    case 'text':
    default: {
      const text = token.text ?? token.raw ?? '';
      if (text.trim()) {
        return React.createElement(Text, { key: index }, text);
      }
      return React.createElement(Text, { key: index }, ' ');
    }
  }
}

export function Markdown(props: MarkdownProps): ReactElement {
  const { content } = props;

  let tokens: ParsedToken[];
  try {
    const parsed = marked.lexer(content);
    tokens = parsed as unknown as ParsedToken[];
  } catch {
    return React.createElement(Text, null, content);
  }

  const hasBlockElements = tokens.some((t) =>
    ['heading', 'code', 'blockquote', 'list', 'table', 'hr'].includes(t.type),
  );

  const elements = tokens.map((token, i) => renderToken(token, i));

  if (hasBlockElements) {
    return React.createElement(Flex, { flexDirection: 'column', gap: 0 }, ...elements);
  }

  // Inline-only: join into single line
  const inlineText = tokens.map((t) => t.text ?? t.raw ?? '').join('');
  return React.createElement(Text, null, inlineText);
}
