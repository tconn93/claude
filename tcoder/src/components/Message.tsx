import React, { type ReactElement } from 'react';
import type { Message as MessageType, AssistantMessage, UserMessage, SystemMessage, ThinkingBlock } from '../types/message.ts';
import { Box } from './ui/Box.tsx';
import { Text } from './ui/Text.tsx';
import { Flex } from './ui/Flex.tsx';
import { Markdown } from './Markdown.tsx';

export interface MessageProps {
  message: MessageType;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function roleColor(role: string): string {
  switch (role) {
    case 'user': return '#3b82f6';
    case 'assistant': return '#22c55e';
    case 'system': return '#8b5cf6';
    default: return '#6a6a7e';
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'user': return 'You';
    case 'assistant': return 'tcoder';
    case 'system': return 'System';
    default: return role;
  }
}

function renderAssistantContent(msg: AssistantMessage): ReactElement[] {
  const blocks = msg.content;
  return blocks.map((block, idx) => {
    if (block.type === 'text') {
      return React.createElement(
        Markdown,
        { key: idx, content: block.text },
      );
    }
    if (block.type === 'thinking') {
      const thinkingBlock = block as ThinkingBlock;
      return React.createElement(
        Box,
        {
          key: idx,
          border: 'round',
          borderColor: '#7c3aed',
          padding: 0,
        },
        React.createElement(Flex, { flexDirection: 'column', gap: 0 },
          React.createElement(Text, { dim: true, italic: true, color: '#a78bfa' }, 'Thinking...'),
          React.createElement(Text, { dim: true, color: '#a78bfa' },
            thinkingBlock.thinking.slice(0, 500) + (thinkingBlock.thinking.length > 500 ? '...' : ''),
          ),
        ),
      );
    }
    if (block.type === 'tool_use') {
      const toolBlock = block as unknown as { name: string; input: Record<string, unknown> };
      return React.createElement(
        Box,
        {
          key: idx,
          border: 'round',
          borderColor: '#f97316',
          padding: 0,
        },
        React.createElement(Flex, { flexDirection: 'column', gap: 0 },
          React.createElement(Text, { color: '#f97316', bold: true }, `Tool: ${toolBlock.name}`),
          React.createElement(Text, { dim: true },
            JSON.stringify(toolBlock.input, null, 2).slice(0, 200),
          ),
        ),
      );
    }
    if (block.type === 'tool_result') {
      const resultBlock = block as unknown as { content: string; isError?: boolean };
      const color = resultBlock.isError ? '#ef4444' : '#6a6a7e';
      return React.createElement(
        Text,
        { key: idx, dim: true, color },
        resultBlock.content?.slice(0, 300) ?? '',
      );
    }
    return React.createElement(Text, { key: idx }, JSON.stringify(block));
  });
}

function renderUserContent(msg: UserMessage): ReactElement {
  const content = msg.content;
  if (typeof content === 'string') {
    return React.createElement(Text, { color: '#3b82f6' }, content);
  }
  const text = content.map((c) => c.text ?? '').join('\n');
  return React.createElement(Text, { color: '#3b82f6' }, text);
}

export function MessageComponent(props: MessageProps): ReactElement {
  const { message } = props;
  const role = message.role;
  const color = roleColor(role);
  const label = roleLabel(role);
  const time = formatTimestamp(message.timestamp);

  const header = React.createElement(
    Flex,
    { flexDirection: 'row', gap: 1 },
    React.createElement(Text, { bold: true, color }, label),
    time ? React.createElement(Text, { dim: true }, time) : null,
  );

  let body: ReactElement;
  switch (message.type) {
    case 'user':
      body = renderUserContent(message as UserMessage);
      break;
    case 'assistant':
      body = React.createElement(Flex, { flexDirection: 'column', gap: 0 },
        ...renderAssistantContent(message as AssistantMessage),
      );
      break;
    case 'system':
      body = React.createElement(
        Text,
        { dim: true, color: '#8b5cf6' },
        (message as SystemMessage).content,
      );
      break;
    case 'progress':
      body = React.createElement(
        Text,
        { dim: true, italic: true },
        (message as { content: string }).content,
      );
      break;
    default:
      body = React.createElement(
        Text,
        { dim: true },
        JSON.stringify(message),
      );
  }

  return React.createElement(
    Box,
    { paddingX: 1, paddingY: 0 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      header,
      React.createElement(Box, { marginLeft: 2 },
        body,
      ),
    ),
  );
}

// Re-export for convenience
export { MessageComponent as Message };
