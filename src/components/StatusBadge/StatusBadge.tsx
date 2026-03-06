import { Badge } from '@mantine/core';
import type { Status } from '../../types/obligation';

const CONFIG: Record<Status, { label: string; color: string }> = {
  upcoming: { label: 'Upcoming', color: 'teal' },
  'due-soon': { label: 'Due Soon', color: 'yellow' },
  overdue: { label: 'Overdue', color: 'red' },
  completed: { label: 'Completed', color: 'gray' },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = CONFIG[status];
  return (
    <Badge variant="light" color={color} size="sm">
      {label}
    </Badge>
  );
}
