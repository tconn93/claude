import React, { type ReactNode, type ReactElement } from 'react';

export interface ListItemProps {
  children?: ReactNode;
  marker?: string;
  index?: number;
}

export function ListItem(props: ListItemProps): ReactElement {
  const { children, marker, index } = props;

  const prefix = marker ?? (index !== undefined ? `${index + 1}.` : '•');

  return React.createElement('Flex', { flexDirection: 'row', gap: 1 },
    React.createElement('text', { dim: true }, prefix),
    typeof children === 'string'
      ? React.createElement('text', null, children)
      : children,
  );
}
