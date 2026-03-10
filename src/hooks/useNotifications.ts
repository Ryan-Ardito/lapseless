import { useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Obligation, AppNotification } from '../types/obligation';
import { useLocalStorage } from './useLocalStorage';
import { getObligationStatus } from '../utils/dates';
import { generateMessage } from '../utils/notifications';

const CHECK_INTERVAL = 30_000;

function getFrequencyMs(freq: 'once' | 'daily' | 'weekly'): number | null {
  switch (freq) {
    case 'once': return null;
    case 'daily': return 24 * 60 * 60 * 1000;
    case 'weekly': return 7 * 24 * 60 * 60 * 1000;
  }
}

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/vite.svg' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/vite.svg' });
      }
    });
  }
}

export function useNotifications(obligations: Obligation[]) {
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('lapseless-notifications', []);
  const lastNotifiedRef = useRef<Map<string, number>>(new Map());

  // Initialize from existing notifications
  useEffect(() => {
    for (const n of notifications) {
      const key = `${n.obligationId}-${n.channel}`;
      const ts = new Date(n.triggeredAt).getTime();
      const existing = lastNotifiedRef.current.get(key) ?? 0;
      if (ts > existing) {
        lastNotifiedRef.current.set(key, ts);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAndNotify = useCallback(() => {
    const newNotifications: AppNotification[] = [];
    const now = Date.now();

    for (const ob of obligations) {
      if (ob.completed) continue;
      const status = getObligationStatus(ob.dueDate, false);
      if (status !== 'due-soon' && status !== 'overdue') continue;

      const frequency = ob.notification.reminderFrequency ?? 'once';

      for (const channel of ob.notification.channels) {
        const key = `${ob.id}-${channel}`;
        const lastNotified = lastNotifiedRef.current.get(key);

        if (lastNotified !== undefined) {
          const frequencyMs = getFrequencyMs(frequency);
          if (frequencyMs === null) continue; // 'once' — already notified
          if (now - lastNotified < frequencyMs) continue; // not time yet
        }

        lastNotifiedRef.current.set(key, now);
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

        // Browser notification for all channels (OS-level)
        if (channel === 'browser' || ob.notification.channels.includes('browser')) {
          showBrowserNotification('Lapseless', message);
        }
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
    lastNotifiedRef.current.clear();
  }, [setNotifications]);

  return { notifications, unreadCount, markAllRead, clearAll };
}
