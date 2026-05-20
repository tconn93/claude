import React, { type ReactNode, type ReactElement } from 'react';

export interface ScrollBoxProps {
  children?: ReactNode;
  height?: number;
  scrollOffset?: number;
  showScrollbar?: boolean;
}

export function ScrollBox(props: ScrollBoxProps): ReactElement {
  const { children, height = 10, scrollOffset = 0 } = props;
  return React.createElement('ScrollBox', { height, scrollOffset }, children);
}
