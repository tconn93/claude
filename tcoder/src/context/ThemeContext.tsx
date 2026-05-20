import React, { createContext, useContext, useState, useCallback, type ReactNode, type ReactElement } from 'react';
import type { Theme } from '../design-system/themes.ts';
import { getTheme } from '../design-system/themes.ts';

export interface ThemeContextValue {
  theme: Theme;
  themeName: string;
  setTheme: (name: string) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: getTheme('dark'),
  themeName: 'dark',
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeCtx);
}

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: string;
}

export function ThemeProvider({
  children,
  initialTheme = 'dark',
}: ThemeProviderProps): ReactElement {
  const [themeName, setThemeName] = useState(initialTheme);

  const setTheme = useCallback((name: string) => {
    setThemeName(name);
  }, []);

  const theme = getTheme(themeName);

  const value: ThemeContextValue = { theme, themeName, setTheme };

  return React.createElement(ThemeCtx.Provider, { value }, children);
}
