import React, { createContext, useContext, type ReactNode, type ReactElement } from 'react';
import { useNotifications, type Notification } from '../hooks/useNotifications.ts';

export interface NotificationsContextValue {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsCtx = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}

export interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({
  children,
}: NotificationsProviderProps): ReactElement {
  const value = useNotifications();
  return React.createElement(NotificationsCtx.Provider, { value }, children);
}
