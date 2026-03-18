import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconClock } from '@tabler/icons-react';
import type { Obligation, AppNotification } from '../types/obligation';
import * as api from '../api/notifications';
import { getObligationStatus } from '../utils/dates';
import { generateMessage } from '../utils/notifications';
import { queryKeys } from './queryKeys';

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

/** Read-only hook: fetches notifications and provides actions. */
export function useNotifications() {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.getNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const clearAllMutation = useMutation({
    mutationFn: api.clearAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAllRead: () => markAllReadMutation.mutateAsync(),
    clearAll: () => clearAllMutation.mutateAsync(),
  };
}

/** Side-effect hook: checks obligations and creates notifications. Call once globally. */
export function useNotificationChecker(obligations: Obligation[]) {
  const qc = useQueryClient();
  const lastNotifiedRef = useRef<Map<string, number>>(new Map());
  const hasInitializedRef = useRef(false);

  const { data: notifications = [], isSuccess } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.getNotifications,
  });

  const addMutation = useMutation({
    mutationFn: api.addNotifications,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const clearAllMutation = useMutation({
    mutationFn: api.clearAll,
    onSuccess: () => {
      lastNotifiedRef.current.clear();
      hasInitializedRef.current = false;
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  // Initialize lastNotifiedRef from existing notifications once the query has loaded
  useEffect(() => {
    if (!isSuccess || hasInitializedRef.current) return;
    for (const n of notifications) {
      const key = `${n.obligationId}-${n.channel}`;
      const ts = new Date(n.triggeredAt).getTime();
      const existing = lastNotifiedRef.current.get(key) ?? 0;
      if (ts > existing) {
        lastNotifiedRef.current.set(key, ts);
      }
    }
    hasInitializedRef.current = true;
  }, [isSuccess, notifications]);

  const checkAndNotify = useCallback(() => {
    if (!hasInitializedRef.current) return;

    const newNotifications: AppNotification[] = [];
    const now = Date.now();

    for (const ob of obligations) {
      if (ob.completed) continue;
      if (ob.notification.muted) continue;
      const status = getObligationStatus(ob.dueDate, false);
      if (status !== 'due-soon' && status !== 'overdue') continue;

      const frequency = ob.notification.reminderFrequency ?? 'once';

      for (const channel of ob.notification.channels) {
        const key = `${ob.id}-${channel}`;
        const lastNotified = lastNotifiedRef.current.get(key);

        if (lastNotified !== undefined) {
          const frequencyMs = getFrequencyMs(frequency);
          if (frequencyMs === null) continue;
          if (now - lastNotified < frequencyMs) continue;
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
          icon: status === 'overdue'
            ? <IconAlertTriangle size={18} />
            : <IconClock size={18} />,
          duration: 5000,
        });

        if (channel === 'browser' || ob.notification.channels.includes('browser')) {
          showBrowserNotification('Obligation Reminder', message);
        }
      }
    }

    if (newNotifications.length > 0) {
      addMutation.mutate(newNotifications);
    }
  }, [obligations, addMutation]);

  // Run check only after initialization, then on interval
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAndNotify, isSuccess]);

  return { clearAll: () => clearAllMutation.mutateAsync() };
}
