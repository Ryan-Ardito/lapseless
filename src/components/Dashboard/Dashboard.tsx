import type { Obligation, Status } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative, statusSortValue } from '../../utils/dates';
import { createSeedData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './Dashboard.module.css';

interface DashboardProps {
  obligations: Obligation[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onLoadSeed: (data: Obligation[]) => void;
}

const STATUS_CARD_CLASS: Record<Status, string> = {
  overdue: styles.cardOverdue,
  'due-soon': styles.cardDueSoon,
  upcoming: styles.cardUpcoming,
  completed: styles.cardCompleted,
};

const STATUS_STAT_CLASS: Record<Status, string> = {
  overdue: styles.statOverdue,
  'due-soon': styles.statDueSoon,
  upcoming: styles.statUpcoming,
  completed: styles.statCompleted,
};

export function Dashboard({ obligations, onToggleComplete, onDelete, onLoadSeed }: DashboardProps) {
  const sorted = [...obligations].sort((a, b) => {
    const sa = getObligationStatus(a.dueDate, a.completed);
    const sb = getObligationStatus(b.dueDate, b.completed);
    const diff = statusSortValue(sa) - statusSortValue(sb);
    if (diff !== 0) return diff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const counts = obligations.reduce(
    (acc, ob) => {
      const s = getObligationStatus(ob.dueDate, ob.completed);
      acc[s]++;
      return acc;
    },
    { overdue: 0, 'due-soon': 0, upcoming: 0, completed: 0 } as Record<Status, number>,
  );

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Obligations</h2>
        <button className={styles.loadBtn} onClick={() => onLoadSeed(createSeedData())}>
          Load Demo Data
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>No obligations yet</p>
          <p className={styles.emptyText}>Add your first obligation or load demo data to get started.</p>
          <button className={styles.emptyCta} onClick={() => onLoadSeed(createSeedData())}>
            Load Demo Data
          </button>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            {([
              ['overdue', 'Overdue'],
              ['due-soon', 'Due Soon'],
              ['upcoming', 'Upcoming'],
              ['completed', 'Completed'],
            ] as [Status, string][]).map(([key, label]) => (
              <div key={key} className={`${styles.stat} ${STATUS_STAT_CLASS[key]}`}>
                <div className={styles.statCount}>{counts[key]}</div>
                <div className={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>

          <div className={styles.grid}>
            {sorted.map((ob) => {
              const status = getObligationStatus(ob.dueDate, ob.completed);
              return (
                <div key={ob.id} className={`${styles.card} ${STATUS_CARD_CLASS[status]}`}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardName}>{ob.name}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.category}>{ob.category}</span>
                    <span>{formatDate(ob.dueDate)}</span>
                    <span>{formatRelative(ob.dueDate)}</span>
                  </div>
                  {ob.notes && <p className={styles.notes}>{ob.notes}</p>}
                  <div className={styles.channels}>
                    {ob.notification.channels.map((ch) => (
                      <span key={ch} className={styles.channelTag}>{ch}</span>
                    ))}
                  </div>
                  <div className={styles.cardActions} style={{ marginTop: 12 }}>
                    <button
                      className={ob.completed ? styles.undoBtn : styles.completeBtn}
                      onClick={() => onToggleComplete(ob.id)}
                    >
                      {ob.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(ob.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
