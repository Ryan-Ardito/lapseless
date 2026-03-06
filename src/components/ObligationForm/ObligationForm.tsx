import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Category, Channel, Obligation } from '../../types/obligation';
import styles from './ObligationForm.module.css';

const CATEGORIES: Category[] = ['license', 'ceu', 'tax', 'certification', 'insurance', 'other'];
const CHANNELS: Channel[] = ['sms', 'email', 'whatsapp'];

interface ObligationFormProps {
  onAdd: (obligation: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => void;
  onAdded: () => void;
}

export function ObligationForm({ onAdd, onAdded }: ObligationFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('license');
  const [dueDate, setDueDate] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['email']);
  const [reminderDays, setReminderDays] = useState(14);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleChannel(ch: Channel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!dueDate) errs.dueDate = 'Due date is required';
    if (channels.length === 0) errs.channels = 'Select at least one channel';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onAdd({
      name: name.trim(),
      category,
      dueDate,
      notes: notes.trim(),
      notification: { channels, reminderDaysBefore: reminderDays },
    });

    toast.success(`"${name.trim()}" added!`);
    setName('');
    setDueDate('');
    setNotes('');
    setChannels(['email']);
    setReminderDays(14);
    setErrors({});
    onAdded();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Add New Obligation</h2>

      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nursing License Renewal"
        />
        {errors.name && <p className={styles.error}>{errors.name}</p>}
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Category</label>
          <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Due Date</label>
          <input
            className={styles.input}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {errors.dueDate && <p className={styles.error}>{errors.dueDate}</p>}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Notification Channels</label>
          <div className={styles.checkboxGroup}>
            {CHANNELS.map((ch) => (
              <label key={ch} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                />
                {ch}
              </label>
            ))}
          </div>
          {errors.channels && <p className={styles.error}>{errors.channels}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Remind me (days before)</label>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={365}
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea
          className={styles.textarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
        />
      </div>

      <button type="submit" className={styles.submitBtn}>Add Obligation</button>
    </form>
  );
}
