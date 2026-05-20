import React, { createContext, useContext, type ReactNode } from 'react';
import type { TerminalSize } from '../hooks/useTerminalSize.ts';
import type { Theme } from '../../design-system/themes.ts';
import { darkTheme } from '../../design-system/themes.ts';

export interface InkContextValue {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  size: TerminalSize;
  theme: Theme;
  exit: (code?: number) => void;
}

const defaultSize: TerminalSize = {
  width: process.stdout.columns ?? 80,
  height: process.stdout.rows ?? 24,
};

const InkCtx = createContext<InkContextValue>({
  stdin: process.stdin,
  stdout: process.stdout,
  size: defaultSize,
  theme: darkTheme,
  exit: (code?: number) => process.exit(code ?? 0),
});

export function useInk(): InkContextValue {
  return useContext(InkCtx);
}

export interface InkProviderProps {
  children: ReactNode;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  size?: TerminalSize;
  theme?: Theme;
  exit?: (code?: number) => void;
}

export function InkProvider({
  children,
  stdin = process.stdin,
  stdout = process.stdout,
  size = defaultSize,
  theme = darkTheme,
  exit: exitFn = (code?: number) => process.exit(code ?? 0),
}: InkProviderProps): React.ReactElement {
  const value: InkContextValue = { stdin, stdout, size, theme, exit: exitFn };

  return React.createElement(InkCtx.Provider, { value }, children);
}
