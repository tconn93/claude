import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { ProgressBar } from '../ui/ProgressBar.tsx';

export interface TaskProgressProps {
  taskId: string;
  title: string;
  percent: number;
  status?: string;
}

export function TaskProgress(props: TaskProgressProps): ReactElement {
  const { taskId, title, percent, status } = props;

  return React.createElement(
    Box,
    { border: 'single', borderColor: '#3b82f6', paddingX: 1, paddingY: 0 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Flex, { flexDirection: 'row', gap: 1 },
        React.createElement(Text, { bold: true, color: '#3b82f6' }, `[${taskId}]`),
        React.createElement(Text, null, title),
        status
          ? React.createElement(Text, { dim: true }, `(${status})`)
          : null,
      ),
      React.createElement(ProgressBar, {
        percent,
        width: 30,
        color: '#3b82f6',
      }),
    ),
  );
}
