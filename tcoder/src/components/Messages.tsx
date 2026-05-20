import React, { type ReactElement } from 'react';
import type { Message as MessageType } from '../types/message.ts';
import { MessageComponent } from './Message.tsx';
import { Box } from './ui/Box.tsx';
import { Text } from './ui/Text.tsx';
import { Flex } from './ui/Flex.tsx';
import { ScrollBox } from './ui/ScrollBox.tsx';
import { Divider } from './ui/Divider.tsx';
import { Spinner } from './spinner/Spinner.tsx';

export interface MessagesProps {
  messages: MessageType[];
  isThinking?: boolean;
  thinkingLabel?: string;
  scrollOffset?: number;
  maxHeight?: number;
}

export function Messages(props: MessagesProps): ReactElement {
  const {
    messages,
    isThinking = false,
    thinkingLabel = 'Thinking...',
    scrollOffset = 0,
    maxHeight = 40,
  } = props;

  if (messages.length === 0 && !isThinking) {
    return React.createElement(
      Box,
      { padding: 2 },
      React.createElement(Flex, { flexDirection: 'column', gap: 1, alignItems: 'center' },
        React.createElement(Text, { dim: true }, 'No messages yet.'),
        React.createElement(Text, { dim: true }, 'Type a message to get started.'),
      ),
    );
  }

  const visibleMessages = messages.slice(scrollOffset, scrollOffset + maxHeight);

  return React.createElement(
    Flex,
    { flexDirection: 'column', gap: 0 },
    ...visibleMessages.map((msg, idx) =>
      React.createElement(Flex, { key: msg.uuid ?? idx, flexDirection: 'column', gap: 0 },
        React.createElement(MessageComponent, { message: msg }),
        idx < visibleMessages.length - 1 && messages.length > 1
          ? React.createElement(Divider, { char: '─', color: '#3a3a4e' })
          : null,
      ),
    ),
    isThinking
      ? React.createElement(
          Box,
          { paddingX: 1, paddingY: 0 },
          React.createElement(Spinner, { isActive: true, label: thinkingLabel }),
        )
      : null,
  );
}
