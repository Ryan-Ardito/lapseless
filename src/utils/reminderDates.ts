/** Compute reminder dates from rule parameters. Returns YYYY-MM-DD strings. */
export function generateReminderDates(
  dueDate: string,
  daysBefore: number,
  frequency: 'once' | 'daily' | 'weekly' | 'custom',
): string[] {
  if (frequency === 'custom' || !dueDate) return [];

  const due = new Date(dueDate + 'T00:00:00');
  const start = new Date(due);
  start.setDate(start.getDate() - daysBefore);

  // Don't generate dates in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) start.setTime(today.getTime());

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= due) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    if (frequency === 'once') break;
    if (frequency === 'daily') current.setDate(current.getDate() + 1);
    if (frequency === 'weekly') current.setDate(current.getDate() + 7);
  }

  return dates;
}
