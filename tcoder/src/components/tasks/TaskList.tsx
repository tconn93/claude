import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { Divider } from '../ui/Divider.tsx';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-100
  startedAt?: number;
  completedAt?: number;
}

export interface TaskListProps {
  tasks: Task[];
  title?: string;
}

function statusColor(status: Task['status']): string {
  switch (status) {
    case 'pending': return '#6a6a7e';
    case 'running': return '#3b82f6';
    case 'completed': return '#22c55e';
    case 'failed': return '#ef4444';
    case 'cancelled': return '#eab308';
  }
}

function statusIcon(status: Task['status']): string {
  switch (status) {
    case 'pending': return '○';
    case 'running': return '◌';
    case 'completed': return '✓';
    case 'failed': return '✗';
    case 'cancelled': return '⊘';
  }
}

export function TaskList(props: TaskListProps): ReactElement {
  const { tasks, title = 'Tasks' } = props;

  if (tasks.length === 0) {
    return React.createElement(
      Box,
      { padding: 1 },
      React.createElement(Text, { dim: true }, 'No active tasks.'),
    );
  }

  return React.createElement(
    Box,
    { border: 'single', padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Text, { bold: true }, title),
      React.createElement(Divider, { char: '─' }),
      ...tasks.map((task) =>
        React.createElement(Flex, { key: task.id, flexDirection: 'row', gap: 1 },
          React.createElement(Text, { color: statusColor(task.status) }, statusIcon(task.status)),
          React.createElement(Text, { color: statusColor(task.status) }, task.title),
          task.status === 'running' && task.progress !== undefined
            ? React.createElement(Text, { dim: true }, `${task.progress}%`)
            : null,
        ),
      ),
    ),
  );
}
