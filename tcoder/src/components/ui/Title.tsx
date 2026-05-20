import React, { type ReactNode, type ReactElement } from 'react';

export interface TitleProps {
  children?: ReactNode;
  level?: 1 | 2 | 3;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Title(props: TitleProps): ReactElement {
  const { children, level = 1, color, align = 'left' } = props;

  const prefix = level === 1 ? '══ ' : level === 2 ? '── ' : '';

  return React.createElement(
    'Box',
    { padding: 0 },
    React.createElement(
      'text',
      { bold: true, underline: level === 1, color },
      `${prefix}${children}${level === 1 ? ' ══' : ''}`,
    ),
  );
}
