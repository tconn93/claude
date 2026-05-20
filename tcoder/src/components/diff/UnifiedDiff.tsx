import React, { type ReactElement } from 'react';
import { useDiff } from './useDiff.ts';
import { DiffLineComponent } from './DiffLine.tsx';
import { Box } from '../ui/Box.tsx';
import { Text } from '../ui/Text.tsx';
import { Flex } from '../ui/Flex.tsx';

export interface UnifiedDiffProps {
  oldText: string;
  newText: string;
  oldPath?: string;
  newPath?: string;
  contextLines?: number;
  maxLines?: number;
}

export function UnifiedDiff(props: UnifiedDiffProps): ReactElement {
  const {
    oldText,
    newText,
    oldPath = 'a/file',
    newPath = 'b/file',
    contextLines = 3,
    maxLines = 200,
  } = props;

  const diffLines = useDiff(oldText, newText, contextLines);

  const header = React.createElement(
    Flex,
    { flexDirection: 'column', gap: 0 },
    React.createElement(Text, { bold: true, color: '#3b82f6' }, `--- ${oldPath}`),
    React.createElement(Text, { bold: true, color: '#22c55e' }, `+++ ${newPath}`),
  );

  const visibleLines = diffLines.slice(0, maxLines);
  const truncated = diffLines.length > maxLines;

  return React.createElement(
    Box,
    { border: 'single', borderColor: '#4a4a5e', padding: 0 },
    React.createElement(Flex, { flexDirection: 'column', gap: 0 },
      header,
      ...visibleLines.map((line, idx) =>
        React.createElement(DiffLineComponent, { key: idx, line }),
      ),
      truncated
        ? React.createElement(
            Text,
            { dim: true },
            `... ${diffLines.length - maxLines} more lines`,
          )
        : null,
    ),
  );
}
