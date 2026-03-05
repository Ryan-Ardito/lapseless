import type { AppNotification } from '../../types/obligation';
import { formatDate } from '../../utils/dates';
import styles from './Notifications.module.css';

const CHANNEL_ICONS: Record<string, string> = {
  sms: '💬',
  email: '📧',
  whatsapp: '📱',
};

interface NotificationsProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export function Notifications({ notifications, onMarkAllRead, onClearAll }: NotificationsProps) {
  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>Notification History</h2>
        {notifications.length > 0 && (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={onMarkAllRead}>Mark All Read</button>
            <button className={styles.actionBtn} onClick={onClearAll}>Clear All</button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No notifications yet</p>
          <p>Notifications will appear here when obligations are due soon or overdue.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => (
            <div key={n.id} className={`${styles.item} ${!n.read ? styles.unread : ''}`}>
              <span className={styles.icon}>{CHANNEL_ICONS[n.channel] ?? '🔔'}</span>
              <div className={styles.body}>
                <p className={styles.obligationName}>{n.obligationName}</p>
                <p className={styles.message}>{n.message}</p>
                <div className={styles.meta}>
                  <span className={styles.channel}>{n.channel}</span>
                  <span>{formatDate(n.triggeredAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
