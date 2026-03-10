import dayjs from 'dayjs';

export function getNextDueDate(dueDate: string, type: 'monthly' | 'quarterly' | 'yearly'): string {
  const d = dayjs(dueDate);

  switch (type) {
    case 'monthly':
      return d.add(1, 'month').format('YYYY-MM-DD');
    case 'quarterly':
      return d.add(3, 'month').format('YYYY-MM-DD');
    case 'yearly':
      return d.add(1, 'year').format('YYYY-MM-DD');
  }
}
