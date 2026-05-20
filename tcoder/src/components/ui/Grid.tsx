import React, { type ReactNode, type ReactElement } from 'react';

export interface GridProps {
  children?: ReactNode;
  cols?: number;
  gap?: number;
  rowGap?: number;
  colGap?: number;
}

export function Grid(props: GridProps): ReactElement {
  const { children, cols = 2, gap = 0 } = props;
  return React.createElement('Grid', { cols, gap }, children);
}
