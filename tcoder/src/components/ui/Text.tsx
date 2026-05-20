import React, { type ReactNode, type ReactElement } from 'react';

export interface TextProps {
  children?: ReactNode;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
  wrap?: 'wrap' | 'truncate' | 'truncate-end' | 'truncate-middle';
}

export function Text(props: TextProps): ReactElement {
  const { children, ...rest } = props;
  return React.createElement('text', rest, children);
}
