import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { ExitCode } from './ExitCode.tsx';

export interface ShellOutputProps {
  command: string;
  output: string;
  exitCode: number;
  duration?: number;
  maxLines?: number;
}

export function ShellOutput(props: ShellOutputProps): ReactElement {
  const { command, output, exitCode, duration, maxLines = 50 } = props;

  const lines = output.split('\n');
  const displayLines = lines.slice(-maxLines);
  const truncated = lines.length > maxLines;

  return React.createElement(
    Box,
    { border: 'single', borderColor: '#4a4a5e', padding: 0 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Flex, { flexDirection: 'row', gap: 1 },
        React.createElement(Text, { bold: true, color: '#cacade' }, `$ ${command}`),
        React.createElement(ExitCode, { code: exitCode }),
        duration !== undefined
          ? React.createElement(Text, { dim: true }, `${duration}ms`)
          : null,
      ),
      truncated
        ? React.createElement(
            Text,
            { dim: true },
            `... ${lines.length - maxLines} more lines`,
          )
        : null,
      ...displayLines.map((line, i) =>
        React.createElement(Text, { key: i, color: exitCode === 0 ? '#cacade' : '#ef4444' }, line || ' '),
      ),
    ),
  );
}
