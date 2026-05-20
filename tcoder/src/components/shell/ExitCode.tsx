import React, { type ReactElement } from 'react';
import { Text } from '../ui/Text.tsx';

export interface ExitCodeProps {
  code: number;
}

export function ExitCode(props: ExitCodeProps): ReactElement {
  const { code } = props;
  const isSuccess = code === 0;
  const color = isSuccess ? '#22c55e' : '#ef4444';
  const label = isSuccess ? 'OK' : `ERR ${code}`;

  return React.createElement(
    Text,
    { bold: true, color },
    `[${label}]`,
  );
}
