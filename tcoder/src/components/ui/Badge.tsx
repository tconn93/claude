import React, { type ReactNode, type ReactElement } from 'react';

export interface BadgeProps {
  children?: ReactNode;
  color?: string;
  bgColor?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantColors: Record<string, string> = {
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#06b6d4',
  default: '#6a6a7e',
};

export function Badge(props: BadgeProps): ReactElement {
  const { children, color, variant = 'default' } = props;
  const c = color ?? variantColors[variant] ?? variantColors.default;
  const text = typeof children === 'string' ? children : '';
  return React.createElement(
    'text',
    { bold: true, color: c },
    ` ${text} `,
  );
}
