import React, { type ReactElement } from 'react';
import { useSpinner } from './useSpinner.ts';
import { Text } from '../ui/Text.tsx';

export interface SpinnerProps {
  isActive?: boolean;
  label?: string;
  frameSet?: string;
  color?: string;
}

export function Spinner(props: SpinnerProps): ReactElement {
  const { isActive = false, label, frameSet, color = '#a78bfa' } = props;
  const frame = useSpinner(isActive, frameSet);

  if (!isActive) {
    return React.createElement('text', null, '');
  }

  return React.createElement(
    'text',
    { color },
    `${frame} ${label ?? ''}`.trimEnd(),
  );
}
