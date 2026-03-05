import type { Status } from '../../types/obligation';
import styles from './StatusBadge.module.css';

const LABELS: Record<Status, string> = {
  upcoming: 'Upcoming',
  'due-soon': 'Due Soon',
  overdue: 'Overdue',
  completed: 'Completed',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABELS[status]}
    </span>
  );
}
