import React, { type ReactNode, type ReactElement } from 'react';

export interface ListProps {
  children?: ReactNode;
  marker?: string;
  ordered?: boolean;
}

export function List(props: ListProps): ReactElement {
  const { children, marker = '•', ordered = false } = props;

  const mapped = React.Children.map(children, (child, index) => {
    const bullet = ordered ? `${index + 1}.` : marker;
    return React.createElement('Flex', { flexDirection: 'row', gap: 1 },
      React.createElement('text', { dim: true }, bullet),
      child,
    );
  });

  return React.createElement('Flex', { flexDirection: 'column', gap: 0 }, mapped);
}
