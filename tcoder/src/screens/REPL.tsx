import React, { type ReactElement } from 'react';
import type { Message } from '../types/message.ts';
import { Box } from '../components/ui/Box.tsx';
import { Flex } from '../components/ui/Flex.tsx';
import { Text } from '../components/ui/Text.tsx';
import { Divider } from '../components/ui/Divider.tsx';
import { Messages } from '../components/Messages.tsx';
import { PromptInput } from '../components/PromptInput/PromptInput.tsx';
import { Logo } from '../components/logo/Logo.tsx';
import { Spinner } from '../components/spinner/Spinner.tsx';

export interface REPLProps {
  messages: Message[];
  isThinking: boolean;
  onSubmit: (value: string) => void;
  inputHistory: string[];
  showHelp: boolean;
  currentProgress: string | null;
  permissionMode: string;
  model: string;
  workingDirectory: string;
  gitBranch: string | null;
  sessionId: string;
}

export function REPL(props: REPLProps): ReactElement {
  const {
    messages,
    isThinking,
    onSubmit,
    inputHistory,
    showHelp,
    currentProgress,
    permissionMode,
    model,
    workingDirectory,
    gitBranch,
    sessionId,
  } = props;

  const showWelcome = messages.length === 0;

  // Status bar content
  const statusBar = React.createElement(
    Box,
    { paddingX: 1, paddingY: 0 },
    React.createElement(Flex, { flexDirection: 'row', gap: 2 },
      React.createElement(Text, { dim: true }, `[${permissionMode}]`),
      React.createElement(Text, { dim: true }, model),
      gitBranch
        ? React.createElement(Text, { dim: true }, `git:${gitBranch}`)
        : null,
      React.createElement(Text, { dim: true }, sessionId.slice(0, 8)),
      isThinking
        ? React.createElement(Spinner, { isActive: true, label: currentProgress ?? 'thinking' })
        : null,
    ),
  );

  return React.createElement(
    Flex,
    { flexDirection: 'column', gap: 0, width: process.stdout.columns },
    showWelcome
      ? React.createElement(
          Box,
          { padding: 1 },
          React.createElement(Flex, { flexDirection: 'column', gap: 1, alignItems: 'center' },
            React.createElement(Logo, { size: 'full' }),
            React.createElement(Text, { dim: true }, `Session: ${sessionId.slice(0, 8)}`),
            React.createElement(Text, { dim: true }, `Model: ${model} | Mode: ${permissionMode}`),
            React.createElement(Text, { dim: true }, `CWD: ${workingDirectory}`),
            gitBranch
              ? React.createElement(Text, { dim: true }, `Branch: ${gitBranch}`)
              : null,
            React.createElement(Divider, { char: '─', color: '#4a4a5e' }),
            showHelp
              ? React.createElement(
                  Box,
                  { paddingX: 2, paddingY: 0 },
                  React.createElement(Flex, { flexDirection: 'column', gap: 0 },
                    React.createElement(Text, { bold: true }, 'Commands:'),
                    React.createElement(Text, { dim: true }, '/help    - Show this help'),
                    React.createElement(Text, { dim: true }, '/clear   - Clear conversation'),
                    React.createElement(Text, { dim: true }, '/model   - Change model'),
                    React.createElement(Text, { dim: true }, '/theme   - Change theme'),
                    React.createElement(Text, { dim: true }, '/status  - System status'),
                    React.createElement(Text, { dim: true }, '/exit    - Exit tcoder'),
                    React.createElement(Text, { dim: true }, 'Ctrl+C   - Exit'),
                  ),
                )
              : null,
          ),
        )
      : null,

    React.createElement(
      Box,
      { paddingX: 0, paddingY: 0, flexGrow: 1 },
      React.createElement(Messages, {
        messages,
        isThinking,
        thinkingLabel: currentProgress ?? 'Thinking...',
      }),
    ),

    React.createElement(Divider, { char: '─', color: '#4a4a5e' }),

    statusBar,

    React.createElement(PromptInput, {
      onSubmit,
      disabled: isThinking,
      initialHistory: inputHistory,
      placeholder: isThinking ? 'Waiting for response...' : 'Type your message...',
      prefix: '> ',
    }),
  );
}
