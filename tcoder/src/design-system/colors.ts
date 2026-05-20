export const colors = {
  // Base palette
  black: '#000000',
  white: '#FFFFFF',

  // Grays
  gray100: '#1a1a2e',
  gray200: '#2a2a3e',
  gray300: '#3a3a4e',
  gray400: '#4a4a5e',
  gray500: '#6a6a7e',
  gray600: '#8a8a9e',
  gray700: '#aaaabe',
  gray800: '#cacade',
  gray900: '#eaeafe',

  // Primary (blue)
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',

  // Accent
  purple500: '#8b5cf6',
  purple600: '#7c3aed',

  // Semantic
  red500: '#ef4444',
  red600: '#dc2626',
  green500: '#22c55e',
  green600: '#16a34a',
  yellow500: '#eab308',
  yellow600: '#ca8a04',
  orange500: '#f97316',
  cyan500: '#06b6d4',
  magenta500: '#d946ef',

  // Role-based
  user: '#3b82f6',
  assistant: '#22c55e',
  system: '#8b5cf6',
  error: '#ef4444',
  warning: '#eab308',
  success: '#22c55e',
  info: '#06b6d4',
  thinking: '#a78bfa',
  tool: '#f97316',
  dim: '#6a6a7e',
} as const;

export type ColorKey = keyof typeof colors;
