import { Badge } from '@mantine/core';
import type { Status } from '../../types/obligation';
import { STATUS_COLORS } from '../../constants/theme';

export function StatusBadge({ status }: { status: Status }) {
  const labels: Record<Status, string> = {
    upcoming: 'Upcoming',
    'due-soon': 'Due Soon',
    overdue: 'Overdue',
    completed: 'Completed',
  };
  return (
    <Badge variant="light" color={STATUS_COLORS[status]} size="sm">
      {labels[status]}
    </Badge>
  );
}
