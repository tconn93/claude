import React, { type ReactElement } from 'react';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';
import { APP_NAME, APP_VERSION } from '../../constants/common.ts';

const ASCII_LOGO = [
  '████████╗ ██████╗ ██████╗ ██████╗ ███████╗██████╗ ',
  '╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗',
  '   ██║   ██║     ██║   ██║██║  ██║█████╗  ██████╔╝',
  '   ██║   ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗',
  '   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║',
  '   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝',
];

export interface LogoProps {
  size?: 'small' | 'full';
  showVersion?: boolean;
}

export function Logo(props: LogoProps): ReactElement {
  const { size = 'full', showVersion = true } = props;

  if (size === 'small') {
    return React.createElement(
      Flex,
      { flexDirection: 'row', gap: 1 },
      React.createElement(Text, { bold: true, color: '#3b82f6' }, APP_NAME),
      showVersion
        ? React.createElement(Text, { dim: true }, `v${APP_VERSION}`)
        : null,
    );
  }

  return React.createElement(
    Box,
    { padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      ...ASCII_LOGO.map((line) =>
        React.createElement(Text, { color: '#3b82f6', bold: true }, line),
      ),
      React.createElement(Text, { dim: true }, `  v${APP_VERSION} -- Terminal AI Coding Assistant`),
    ),
  );
}
