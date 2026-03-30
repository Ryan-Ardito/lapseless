export function getNextDueDate(dueDate: string, type: string): string {
  const d = new Date(dueDate + 'T00:00:00');
  switch (type) {
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

/** Shift an array of YYYY-MM-DD date strings forward by a number of days. */
export function shiftDates(dates: string[], daysDelta: number): string[] {
  return dates.map((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + daysDelta);
    return d.toISOString().split('T')[0];
  });
}

/** Returns today's date as YYYY-MM-DD in the given IANA timezone. */
export function getTodayInTimezone(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}
