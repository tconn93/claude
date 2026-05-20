import React, { type ReactNode, type ReactElement } from 'react';

export interface FlexProps {
  children?: ReactNode;
  flexDirection?: 'row' | 'column';
  gap?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  flexWrap?: 'nowrap' | 'wrap';
  width?: number;
}

export function Flex(props: FlexProps): ReactElement {
  const { children, flexDirection = 'column', gap = 0, ...rest } = props;
  return React.createElement('Flex', { flexDirection, gap, ...rest }, children);
}
