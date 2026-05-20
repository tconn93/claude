import React, { type ReactElement } from 'react';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  isFocused?: boolean;
  color?: string;
  variant?: 'default' | 'primary' | 'danger';
}

export function Button(props: ButtonProps): ReactElement {
  const { label, isFocused, color, variant = 'default' } = props;

  const variantColors: Record<string, string> = {
    primary: '#3b82f6',
    danger: '#ef4444',
    default: '#6a6a7e',
  };

  const c = color ?? variantColors[variant] ?? variantColors.default;
  const prefix = isFocused ? '> ' : '  ';
  const style = isFocused ? { inverse: true, bold: true } : {};

  return React.createElement(
    'text',
    { color: c, ...style },
    `${prefix}[ ${label} ]`,
  );
}
