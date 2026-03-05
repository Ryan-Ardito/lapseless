import type { Obligation } from '../../types/obligation';
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

export function Dashboard({ obligations, onToggleComplete, onDelete, onLoadSeed }: DashboardProps) {
  const sorted = [...obligations].sort((a, b) => {
    const sa = getObligationStatus(a.dueDate, a.completed);
    const sb = getObligationStatus(b.dueDate, b.completed);
    const diff = statusSortValue(sa) - statusSortValue(sb);
    if (diff !== 0) return diff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

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
          <p className={styles.emptyTitle}>No obligations yet</p>
          <p>Add your first obligation or load demo data to get started.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map((ob) => {
            const status = getObligationStatus(ob.dueDate, ob.completed);
            return (
              <div key={ob.id} className={styles.card}>
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
      )}
    </div>
  );
}
