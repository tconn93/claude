import React, { type ReactNode, type ReactElement } from 'react';

export interface BoxProps {
  children?: ReactNode;
  border?: 'single' | 'double' | 'round' | 'bold';
  borderColor?: string;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  width?: number;
  minHeight?: number;
  height?: number;
  flexGrow?: number;
  flexShrink?: number;
  overflow?: 'hidden' | 'visible';
}

export function Box(props: BoxProps): ReactElement {
  const {
    paddingX,
    paddingY,
    ...rest
  } = props;

  const p = props.padding ?? 0;
  const px = paddingX ?? p;
  const py = paddingY ?? p;

  return React.createElement('Box', {
    ...rest,
    padding: Math.max(px, py),
  });
}
