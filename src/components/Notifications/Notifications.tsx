import { useMemo, useState } from 'react';
import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconBell, IconBellOff } from '@tabler/icons-react';
import { formatDate } from '../../utils/dates';
import { CHANNEL_ICONS } from '../../constants/theme';
import { useObligations } from '../../hooks/useObligations';
import { useNotifications } from '../../hooks/useNotifications';
import { ObligationDetailModal } from '../ObligationDetailModal/ObligationDetailModal';
import { ListSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import type { Obligation } from '../../types/obligation';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';

export function Notifications() {
  const { obligations, isLoading, isError, error, refetch, updateObligation, deleteObligation, toggleComplete } = useObligations();
  const { notifications, markAllRead, clearAll } = useNotifications();

  const activeObligationIds = useMemo(() => new Set(obligations.map((o) => o.id)), [obligations]);
  const sortedNotifications = useMemo(() =>
    [...notifications].sort((a, b) => {
      const aDeleted = !activeObligationIds.has(a.obligationId);
      const bDeleted = !activeObligationIds.has(b.obligationId);
      if (aDeleted !== bDeleted) return aDeleted ? 1 : -1;
      return 0; // preserve existing time-based order within each group
    }),
    [notifications, activeObligationIds],
  );
  const { value: selectedId, open: openObligation, close: closeObligation } = useModalSearchParam('obligationId');
  const [deletedFallback, setDeletedFallback] = useState<Obligation | null>(null);
  const selected = selectedId ? (obligations.find((o) => o.id === selectedId) ?? deletedFallback) : null;

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  function handleNotificationClick(n: typeof notifications[number]) {
    const ob = obligations.find((o) => o.id === n.obligationId);
    if (ob) {
      openObligation(ob.id);
      setDeletedFallback(null);
    } else {
      // Obligation was deleted — build a minimal stand-in from the notification data
      openObligation(n.obligationId);
      setDeletedFallback({
        id: n.obligationId,
        name: n.obligationName,
        category: 'other',
        dueDate: '',
        notes: '',
        notification: { channels: [], reminderDaysBefore: 0, muted: false },
        completed: false,
        createdAt: n.triggeredAt,
        deletedAt: 'deleted',
      });
    }
  }

  return (
    <Stack gap="lg">
      {notifications.length > 0 && (
        <Group justify="flex-end" gap="xs">
          <Button variant="light" size="xs" onClick={markAllRead}>Mark All Read</Button>
          <Button variant="light" color="red" size="xs" onClick={clearAll}>Clear All</Button>
        </Group>
      )}

      {notifications.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="sm">
            <IconBellOff size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={4}>No notifications yet</Title>
            <Text c="dimmed">
              Notifications will appear here when obligations are due soon or overdue.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="sm">
          {sortedNotifications.map((n) => {
            const ChannelIcon = CHANNEL_ICONS[n.channel] ?? IconBell;
            const isDeleted = !activeObligationIds.has(n.obligationId);
            return (
              <Paper
                key={n.id}
                p="md"
                radius="md"
                withBorder
                shadow="xs"
                className="hover-row"
                style={{
                  cursor: 'pointer',
                  opacity: isDeleted ? 0.55 : undefined,
                  borderLeftWidth: !n.read && !isDeleted ? 3 : 1,
                  borderLeftColor: !n.read && !isDeleted ? 'var(--mantine-color-sage-5)' : undefined,
                  backgroundColor: !n.read && !isDeleted ? 'var(--mantine-color-sage-0)' : undefined,
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ChannelIcon size={20} stroke={1.5} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" align="center">
                      <Text fw={600} size="sm">{n.obligationName}</Text>
                      {isDeleted && <Badge variant="light" color="gray" size="xs">Deleted</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed" mt={2}>{n.message}</Text>
                    <Group gap="sm" mt={6}>
                      <Badge variant="light" color="teal" size="xs" tt="uppercase">
                        {n.channel}
                      </Badge>
                      <Text size="xs" c="dimmed">{formatDate(n.triggeredAt)}</Text>
                    </Group>
                  </div>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      <ObligationDetailModal
        obligation={selected}
        onClose={() => { closeObligation(); setDeletedFallback(null); }}
        updateObligation={updateObligation}
        deleteObligation={deleteObligation}
        toggleComplete={toggleComplete}
      />
    </Stack>
  );
}
