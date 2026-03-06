import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { AppNotification } from '../../types/obligation';
import { formatDate } from '../../utils/dates';

const CHANNEL_ICONS: Record<string, string> = {
  sms: '💬',
  email: '📧',
  whatsapp: '📱',
};

interface NotificationsProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export function Notifications({ notifications, onMarkAllRead, onClearAll }: NotificationsProps) {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Notification History</Title>
        {notifications.length > 0 && (
          <Group gap="xs">
            <Button variant="light" size="xs" onClick={onMarkAllRead}>Mark All Read</Button>
            <Button variant="light" color="red" size="xs" onClick={onClearAll}>Clear All</Button>
          </Group>
        )}
      </Group>

      {notifications.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="sm">
            <Title order={4}>No notifications yet</Title>
            <Text c="dimmed">
              Notifications will appear here when obligations are due soon or overdue.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="sm">
          {notifications.map((n) => (
            <Paper
              key={n.id}
              p="md"
              radius="md"
              withBorder
              shadow="xs"
              style={{
                borderLeftWidth: !n.read ? 3 : 1,
                borderLeftColor: !n.read ? 'var(--mantine-color-indigo-5)' : undefined,
                backgroundColor: !n.read ? 'var(--mantine-color-indigo-0)' : undefined,
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Group gap="md" align="flex-start" wrap="nowrap">
                <Text size="xl" lh={1} mt={2}>{CHANNEL_ICONS[n.channel] ?? '🔔'}</Text>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} size="sm">{n.obligationName}</Text>
                  <Text size="sm" c="dimmed" mt={2}>{n.message}</Text>
                  <Group gap="sm" mt={6}>
                    <Badge variant="light" color="violet" size="xs" tt="uppercase">
                      {n.channel}
                    </Badge>
                    <Text size="xs" c="dimmed">{formatDate(n.triggeredAt)}</Text>
                  </Group>
                </div>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
