import React, { type ReactElement } from 'react';

export interface DividerProps {
  title?: string;
  char?: string;
  color?: string;
  padding?: number;
}

export function Divider(props: DividerProps): ReactElement {
  const { char = '─', color, title } = props;
  if (title) {
    return React.createElement('divider', { char, color, title });
  }
  return React.createElement('Divider', { char, color });
}
