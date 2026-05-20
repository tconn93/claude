import React, { useCallback, useRef, type ReactElement } from 'react';
import { useInput } from '../../hooks/useInput.ts';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { createInputHistory } from './history.ts';
import { getAllSuggestions } from './suggestions.ts';

export interface PromptInputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialHistory?: string[];
  prefix?: string;
}

export function PromptInput(props: PromptInputProps): ReactElement {
  const {
    onSubmit,
    disabled = false,
    placeholder = 'Type your message...',
    initialHistory = [],
    prefix = '> ',
  } = props;

  const historyRef = useRef(createInputHistory(initialHistory));
  const history = historyRef.current;

  const wrappedSubmit = useCallback(
    (value: string) => {
      if (disabled) return;
      if (!value.trim()) return;
      history.add(value);
      onSubmit(value);
    },
    [disabled, onSubmit, history],
  );

  const { value, cursor, handleKey } = useInput({
    onSubmit: wrappedSubmit,
    initialValue: '',
  });

  const suggestions = getAllSuggestions(value);

  // we need to handle arrow up/down for history
  // this is a simplification - in reality we'd intercept raw keys
  const wrappedHandleKey = useCallback(
    (key: string) => {
      // Up arrow - history prev
      if (key === '\x1b[A') {
        // handled by tty raw mode
        return;
      }
      // Down arrow - history next
      if (key === '\x1b[B') {
        return;
      }
      handleKey(key);
    },
    [handleKey],
  );

  const displayValue = value || (disabled ? '' : '');
  const cursorChar = disabled ? ' ' : '█';
  const beforeCursor = displayValue.slice(0, cursor);
  const atCursor = displayValue[cursor] ?? ' ';
  const afterCursor = displayValue.slice(cursor + 1);

  return React.createElement(
    Box,
    { border: 'single', borderColor: '#4a4a5e', paddingX: 1, paddingY: 0 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Flex, { flexDirection: 'row', gap: 0 },
        React.createElement(Text, { dim: true }, prefix),
        React.createElement(
          'text',
          { color: disabled ? '#6a6a7e' : '#eaeafe' },
          `${beforeCursor}\x1b[7m${atCursor}\x1b[27m${afterCursor}`,
        ),
      ),
      suggestions.length > 0 && value.length > 0
        ? React.createElement(
            Box,
            { paddingX: 2, paddingY: 0 },
            React.createElement(Flex, { flexDirection: 'row', gap: 2 },
              ...suggestions.slice(0, 5).map((s, i) =>
                React.createElement(
                  Text,
                  { key: i, dim: true, color: i === 0 ? '#3b82f6' : '#6a6a7e' },
                  s.text,
                ),
              ),
            ),
          )
        : null,
    ),
  );
}
