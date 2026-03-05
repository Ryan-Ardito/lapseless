import { useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Obligation, AppNotification } from '../types/obligation';
import { useLocalStorage } from './useLocalStorage';
import { getObligationStatus } from '../utils/dates';
import { generateMessage } from '../utils/notifications';

const CHECK_INTERVAL = 30_000;

export function useNotifications(obligations: Obligation[]) {
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('lapseless-notifications', []);
  const checkedRef = useRef<Set<string>>(new Set());

  // Initialize checkedRef from existing notifications
  useEffect(() => {
    const existing = new Set(notifications.map((n) => `${n.obligationId}-${n.channel}`));
    checkedRef.current = existing;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAndNotify = useCallback(() => {
    const newNotifications: AppNotification[] = [];

    for (const ob of obligations) {
      if (ob.completed) continue;
      const status = getObligationStatus(ob.dueDate, false);
      if (status !== 'due-soon' && status !== 'overdue') continue;

      for (const channel of ob.notification.channels) {
        const key = `${ob.id}-${channel}`;
        if (checkedRef.current.has(key)) continue;

        checkedRef.current.add(key);
        const message = generateMessage(ob.name, ob.dueDate, channel);
        const notification: AppNotification = {
          id: crypto.randomUUID(),
          obligationId: ob.id,
          obligationName: ob.name,
          channel,
          message,
          triggeredAt: new Date().toISOString(),
          read: false,
        };
        newNotifications.push(notification);

        toast(message, {
          icon: status === 'overdue' ? '🚨' : '⏰',
          duration: 5000,
        });
      }
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }
  }, [obligations, setNotifications]);

  useEffect(() => {
    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAndNotify]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [setNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    checkedRef.current.clear();
  }, [setNotifications]);

  return { notifications, unreadCount, markAllRead, clearAll };
}
