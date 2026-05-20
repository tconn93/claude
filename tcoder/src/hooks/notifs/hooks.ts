import { useNotificationsContext } from '../../context/NotificationsContext.tsx';

export function useNotificationToast(): {
  show: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
} {
  const { addNotification } = useNotificationsContext();

  return {
    show(type, message) {
      const duration = type === 'error' ? 5000 : 3000;
      addNotification(type, message, duration);
    },
  };
}

export function useNotificationCount(): number {
  const { notifications } = useNotificationsContext();
  return notifications.length;
}
