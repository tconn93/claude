import { colors } from './colors.ts';

export interface Theme {
  name: string;
  bg: string;
  fg: string;
  muted: string;
  border: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  userBubble: string;
  assistantBubble: string;
  systemBubble: string;
  thinkingText: string;
  toolText: string;
  dimText: string;
  brightText: string;
}

export const darkTheme: Theme = {
  name: 'dark',
  bg: colors.gray100,
  fg: colors.gray900,
  muted: colors.gray600,
  border: colors.gray400,
  accent: colors.blue500,
  error: colors.red500,
  warning: colors.yellow500,
  success: colors.green500,
  info: colors.cyan500,
  userBubble: colors.blue500,
  assistantBubble: colors.green500,
  systemBubble: colors.purple500,
  thinkingText: colors.purple500,
  toolText: colors.orange500,
  dimText: colors.gray600,
  brightText: colors.white,
};

export const lightTheme: Theme = {
  name: 'light',
  bg: colors.white,
  fg: colors.gray100,
  muted: colors.gray500,
  border: colors.gray700,
  accent: colors.blue600,
  error: colors.red600,
  warning: colors.yellow600,
  success: colors.green600,
  info: colors.cyan500,
  userBubble: colors.blue600,
  assistantBubble: colors.green600,
  systemBubble: colors.purple600,
  thinkingText: colors.purple600,
  toolText: colors.orange500,
  dimText: colors.gray500,
  brightText: colors.black,
};

export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

export function getTheme(name: string): Theme {
  return themes[name] ?? darkTheme;
}
