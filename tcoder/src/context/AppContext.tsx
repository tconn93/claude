import React, { createContext, useContext, useMemo, type ReactNode, type ReactElement } from 'react';
import type { AppState, AppStateStore } from '../state/types.ts';
import type { Message } from '../types/message.ts';

export interface AppContextValue {
  state: AppState;
  dispatch: (partial: Partial<AppState>) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setThinking: (thinking: boolean) => void;
  setProgress: (progress: string | null) => void;
}

const AppCtx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppCtx);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}

export function useAppMaybe(): AppContextValue | null {
  return useContext(AppCtx);
}

export interface AppProviderProps {
  children: ReactNode;
  store: AppStateStore;
}

export function AppProvider({ children, store }: AppProviderProps): ReactElement {
  const [state, setState] = React.useState<AppState>(store.getState());

  React.useEffect(() => {
    const unsub = store.subscribe(setState);
    return unsub;
  }, [store]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch: (partial) => store.setState(partial),
      addMessage: (message) => {
        const current = store.getState();
        store.setState({
          messages: [...current.messages, message],
        });
      },
      clearMessages: () => {
        store.setState({ messages: [] });
      },
      setThinking: (thinking) => {
        store.setState({ isThinking: thinking });
      },
      setProgress: (progress) => {
        store.setState({ currentProgress: progress });
      },
    }),
    [state, store],
  );

  return React.createElement(AppCtx.Provider, { value }, children);
}
