import { useState } from 'react';
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

export function Notifications() {
  const { obligations, isLoading, isError, error, refetch, updateObligation, deleteObligation, toggleComplete } = useObligations();
  const { notifications, markAllRead, clearAll } = useNotifications(obligations);
  const [selected, setSelected] = useState<Obligation | null>(null);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  function handleNotificationClick(obligationId: string) {
    const ob = obligations.find((o) => o.id === obligationId);
    if (ob) setSelected(ob);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Notification History</Title>
        {notifications.length > 0 && (
          <Group gap="xs">
            <Button variant="light" size="xs" onClick={markAllRead}>Mark All Read</Button>
            <Button variant="light" color="red" size="xs" onClick={clearAll}>Clear All</Button>
          </Group>
        )}
      </Group>

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
          {notifications.map((n) => {
            const ChannelIcon = CHANNEL_ICONS[n.channel] ?? IconBell;
            return (
              <Paper
                key={n.id}
                p="md"
                radius="md"
                withBorder
                shadow="xs"
                className="hover-lift"
                style={{
                  cursor: 'pointer',
                  borderLeftWidth: !n.read ? 3 : 1,
                  borderLeftColor: !n.read ? 'var(--mantine-color-sage-5)' : undefined,
                  backgroundColor: !n.read ? 'var(--mantine-color-sage-0)' : undefined,
                }}
                onClick={() => handleNotificationClick(n.obligationId)}
              >
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ChannelIcon size={20} stroke={1.5} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm">{n.obligationName}</Text>
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
        onClose={() => setSelected(null)}
        updateObligation={updateObligation}
        deleteObligation={deleteObligation}
        toggleComplete={toggleComplete}
      />
    </Stack>
  );
}
