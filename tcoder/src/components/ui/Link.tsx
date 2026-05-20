import React, { type ReactNode, type ReactElement } from 'react';

export interface LinkProps {
  children?: ReactNode;
  url?: string;
  onPress?: () => void;
}

export function Link(props: LinkProps): ReactElement {
  const { children, url } = props;
  const displayUrl = url ?? '';
  const label = children ?? displayUrl;

  return React.createElement(
    'text',
    { underline: true, color: '#06b6d4' },
    `${typeof label === 'string' ? label : displayUrl}${url ? ` (${url})` : ''}`,
  );
}
