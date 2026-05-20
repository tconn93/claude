import React, { type ReactNode, type ReactElement } from 'react';

export interface TooltipProps {
  children?: ReactNode;
  content: string;
  visible?: boolean;
}

export function Tooltip(props: TooltipProps): ReactElement {
  const { content, visible = false } = props;

  if (!visible || !content) {
    return React.createElement('text', null, '');
  }

  return React.createElement(
    'text',
    { dim: true },
    `[${content}]`,
  );
}
