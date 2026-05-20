import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { Spinner } from '../spinner/Spinner.tsx';

export interface AgentInfo {
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentTask?: string;
  progress?: number;
}

export interface AgentStatusProps {
  agents: AgentInfo[];
}

function statusColor(status: AgentInfo['status']): string {
  switch (status) {
    case 'idle': return '#6a6a7e';
    case 'running': return '#3b82f6';
    case 'completed': return '#22c55e';
    case 'error': return '#ef4444';
  }
}

function statusLabel(status: AgentInfo['status']): string {
  switch (status) {
    case 'idle': return 'IDLE';
    case 'running': return 'RUN';
    case 'completed': return 'DONE';
    case 'error': return 'FAIL';
  }
}

export function AgentStatus(props: AgentStatusProps): ReactElement {
  const { agents } = props;

  if (agents.length === 0) return React.createElement('text', null, '');

  return React.createElement(
    Box,
    { paddingX: 1, paddingY: 0 },
    React.createElement(Flex, { flexDirection: 'row', gap: 2 },
      ...agents.map((agent) =>
        React.createElement(Flex, { key: agent.name, flexDirection: 'row', gap: 1 },
          React.createElement(
            Text,
            { bold: true, color: statusColor(agent.status) },
            `[${statusLabel(agent.status)}]`,
          ),
          React.createElement(Text, null, agent.name),
          agent.status === 'running' && agent.currentTask
            ? React.createElement(Text, { dim: true }, agent.currentTask)
            : null,
          agent.status === 'running'
            ? React.createElement(Spinner, { isActive: true })
            : null,
        ),
      ),
    ),
  );
}
