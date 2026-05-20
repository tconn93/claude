import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';

export interface MCPServerInfo {
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  toolCount?: number;
  error?: string;
  latency?: number;
}

export interface MCPServerStatusProps {
  servers: MCPServerInfo[];
}

function statusColor(status: MCPServerInfo['status']): string {
  switch (status) {
    case 'connected': return '#22c55e';
    case 'disconnected': return '#6a6a7e';
    case 'connecting': return '#eab308';
    case 'error': return '#ef4444';
  }
}

function statusIcon(status: MCPServerInfo['status']): string {
  switch (status) {
    case 'connected': return '●';
    case 'disconnected': return '○';
    case 'connecting': return '◌';
    case 'error': return '✗';
  }
}

export function MCPServerStatus(props: MCPServerStatusProps): ReactElement {
  const { servers } = props;

  if (servers.length === 0) {
    return React.createElement(
      Box,
      { padding: 1 },
      React.createElement(Text, { dim: true }, 'No MCP servers configured.'),
    );
  }

  return React.createElement(
    Box,
    { border: 'single', padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      React.createElement(Text, { bold: true, underline: true }, 'MCP Servers'),
      ...servers.map((server) =>
        React.createElement(
          Flex,
          { key: server.name, flexDirection: 'row', gap: 1 },
          React.createElement(
            Text,
            { color: statusColor(server.status) },
            `${statusIcon(server.status)} ${server.name}`,
          ),
          server.toolCount !== undefined
            ? React.createElement(Text, { dim: true }, `(${server.toolCount} tools)`)
            : null,
          server.latency !== undefined
            ? React.createElement(Text, { dim: true }, `${server.latency}ms`)
            : null,
          server.error
            ? React.createElement(Text, { color: '#ef4444' }, server.error)
            : null,
        ),
      ),
    ),
  );
}
