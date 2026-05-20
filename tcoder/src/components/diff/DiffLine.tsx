import React, { type ReactElement } from 'react';
import { Text } from '../ui/Text.tsx';
import type { DiffLine as DiffLineType } from './useDiff.ts';

export interface DiffLineProps {
  line: DiffLineType;
  showLineNumbers?: boolean;
}

export function DiffLineComponent(props: DiffLineProps): ReactElement {
  const { line, showLineNumbers = true } = props;

  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
  const color =
    line.type === 'add' ? '#22c55e' :
    line.type === 'remove' ? '#ef4444' :
    '#6a6a7e';

  const oldNum = line.lineNumber.old !== null ? String(line.lineNumber.old).padStart(4) : '    ';
  const newNum = line.lineNumber.new !== null ? String(line.lineNumber.new).padStart(4) : '    ';

  return React.createElement(
    Text,
    { color },
    showLineNumbers
      ? `${oldNum} ${newNum} ${prefix} ${line.content}`
      : `${prefix} ${line.content}`,
  );
}
