import { useState, useCallback, useRef } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  duration?: number;
}

let nextId = 0;

export function useNotifications(): {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
} {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeNotification = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (type: Notification['type'], message: string, duration: number = 3000) => {
      const id = String(++nextId);
      const notification: Notification = { id, type, message, timestamp: Date.now(), duration };
      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeNotification],
  );

  const clearAll = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  return { notifications, addNotification, removeNotification, clearAll };
}
