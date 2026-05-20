import React, { useCallback, type ReactElement } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { useTerminalSize } from '../hooks/useTerminalSize.ts';
import { REPL } from '../screens/REPL.tsx';
import { InkProvider } from '../ink/components/InkContext.tsx';
import { ThemeProvider } from '../context/ThemeContext.tsx';
import { NotificationsProvider } from '../context/NotificationsContext.tsx';

export interface AppComponentProps {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
}

export function App(props: AppComponentProps): ReactElement {
  const { stdin = process.stdin, stdout = process.stdout } = props;
  const size = useTerminalSize();
  const app = useApp();

  const handleSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) return;
      app.addMessage({
        type: 'user',
        role: 'user',
        content: value,
        uuid: crypto.randomUUID?.() ?? Math.random().toString(36),
        timestamp: Date.now(),
      });
      app.setThinking(true);
    },
    [app],
  );

  const handleExit = useCallback(
    (code: number = 0) => {
      // Clean shutdown
      process.exit(code);
    },
    [],
  );

  return React.createElement(
    InkProvider,
    { stdin, stdout, size, exit: handleExit },
    React.createElement(
      ThemeProvider,
      { initialTheme: app.state.theme ?? 'dark' },
      React.createElement(
        NotificationsProvider,
        null,
        React.createElement(REPL, {
          messages: app.state.messages,
          isThinking: app.state.isThinking,
          onSubmit: handleSubmit,
          inputHistory: app.state.inputHistory,
          showHelp: app.state.showHelp,
          currentProgress: app.state.currentProgress,
          permissionMode: app.state.permissionMode,
          model: app.state.model,
          workingDirectory: app.state.workingDirectory,
          gitBranch: app.state.gitBranch,
          sessionId: app.state.sessionId,
        }),
      ),
    ),
  );
}
