import React, { type ReactElement } from 'react';

export interface ProgressBarProps {
  percent: number;
  width?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar(props: ProgressBarProps): ReactElement {
  const { percent, width = 20, color, showLabel = false, label } = props;

  return React.createElement('Flex', { flexDirection: 'column', gap: 0 },
    showLabel
      ? React.createElement('text', { dim: true }, label ?? `${Math.round(percent)}%`)
      : null,
    React.createElement('ProgressBar', { percent, width, color }),
  );
}
