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
