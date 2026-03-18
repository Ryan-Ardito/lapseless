import type { Status } from '../types/obligation';

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getObligationStatus(dueDate: string, completed: boolean): Status {
  if (completed) return 'completed';
  const days = daysUntil(dueDate);
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due-soon';
  return 'upcoming';
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = e.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

export function formatRelative(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

const STATUS_ORDER: Record<Status, number> = {
  overdue: 0,
  'due-soon': 1,
  upcoming: 2,
  completed: 3,
};

export function statusSortValue(status: Status): number {
  return STATUS_ORDER[status];
}
