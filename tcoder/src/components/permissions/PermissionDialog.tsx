import React, { type ReactElement } from 'react';
import type { ToolDefinition } from '../../types/tool.ts';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { Divider } from '../ui/Divider.tsx';

export interface PermissionDialogProps {
  tool: ToolDefinition;
  args: Record<string, unknown>;
  onAllow: () => void;
  onDeny: () => void;
  onAllowAll: () => void;
  mode?: string;
}

export function PermissionDialog(props: PermissionDialogProps): ReactElement {
  const { tool, args, mode } = props;

  return React.createElement(
    Box,
    { border: 'double', borderColor: '#eab308', padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 1 },
      React.createElement(
        Text,
        { bold: true, color: '#eab308' },
        `[Permission Required] Tool: ${tool.name}`,
      ),
      React.createElement(Divider, { char: '─', color: '#4a4a5e' }),
      React.createElement(Text, { dim: true }, tool.description),
      mode
        ? React.createElement(Text, { dim: true, color: '#6a6a7e' }, `Mode: ${mode}`)
        : null,
      args && Object.keys(args).length > 0
        ? React.createElement(
            Box,
            { paddingX: 2, paddingY: 0 },
            React.createElement(Flex, { flexDirection: 'column', gap: 0 },
              React.createElement(Text, { dim: true }, 'Arguments:'),
              ...Object.entries(args).map(([k, v]) =>
                React.createElement(
                  Text,
                  { key: k, color: '#cacade' },
                  `  ${k}: ${JSON.stringify(v)}`,
                ),
              ),
            ),
          )
        : null,
      React.createElement(Divider, { char: '─', color: '#4a4a5e' }),
      React.createElement(Flex, { flexDirection: 'row', gap: 2 },
        React.createElement(Text, { bold: true, color: '#22c55e' }, '[Y] Allow'),
        React.createElement(Text, { bold: true, color: '#ef4444' }, '[N] Deny'),
        React.createElement(Text, { bold: true, color: '#3b82f6' }, '[A] Allow All'),
      ),
    ),
  );
}
