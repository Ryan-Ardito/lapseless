import { useMemo } from 'react';
import { Badge, Button, Drawer, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconBell, IconBellOff, IconExternalLink } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { formatDate } from '../../utils/dates';
import { CHANNEL_ICONS } from '../../constants/theme';
import { useObligations } from '../../hooks/useObligations';
import { useNotifications } from '../../hooks/useNotifications';
import { ListSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';
import { useOrgContext } from '../../contexts/OrgContext';
import { useAppMode } from '../../contexts/AppModeContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export function Notifications() {
  const { obligations, isLoading, isError, error, refetch } = useObligations();
  const { notifications, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();
  const { orgId } = useOrgContext();
  const mode = useAppMode();
  const isMobile = useIsMobile();

  const activeObligationIds = useMemo(() => new Set(obligations.map((o) => o.id)), [obligations]);
  const sortedNotifications = useMemo(() =>
    [...notifications].sort((a, b) => {
      const aDeleted = !activeObligationIds.has(a.obligationId);
      const bDeleted = !activeObligationIds.has(b.obligationId);
      if (aDeleted !== bDeleted) return aDeleted ? 1 : -1;
      return 0;
    }),
    [notifications, activeObligationIds],
  );

  const { value: selectedId, open: openNotification, close: closeNotification } = useModalSearchParam('notificationId');
  const selected = selectedId ? notifications.find((n) => n.id === selectedId) ?? null : null;

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  function viewObligation(obligationId: string) {
    closeNotification();
    const base = mode === 'demo' ? '/demo/dashboard' : `/app/orgs/${orgId}/dashboard`;
    navigate({ to: base, search: { obligationId } });
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
                onClick={() => openNotification(n.id)}
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

      <Drawer
        opened={selected !== null}
        onClose={closeNotification}
        title="Notification"
        position="right"
        size={isMobile ? '100%' : 'md'}
        overlayProps={{ backgroundOpacity: 0.3 }}
      >
        {selected && (() => {
          const ChannelIcon = CHANNEL_ICONS[selected.channel] ?? IconBell;
          const isDeleted = !activeObligationIds.has(selected.obligationId);
          return (
            <Stack gap="md">
              <Text size="lg" fw={600}>{selected.obligationName}</Text>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Message</Text>
                <Text size="sm">{selected.message}</Text>
              </div>

              <Group gap="lg">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Channel</Text>
                  <Group gap={6} mt={4}>
                    <ChannelIcon size={16} stroke={1.5} />
                    <Badge variant="light" color="teal" size="sm" tt="uppercase">{selected.channel}</Badge>
                  </Group>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Sent</Text>
                  <Text size="sm" mt={4}>{formatDate(selected.triggeredAt)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Status</Text>
                  <Badge variant="light" color={selected.read ? 'gray' : 'sage'} size="sm" mt={4}>
                    {selected.read ? 'Read' : 'Unread'}
                  </Badge>
                </div>
              </Group>

              {isDeleted ? (
                <Text c="dimmed" size="sm" fs="italic">This obligation has been deleted.</Text>
              ) : (
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => viewObligation(selected.obligationId)}
                >
                  View Obligation
                </Button>
              )}
            </Stack>
          );
        })()}
      </Drawer>
    </Stack>
  );
}
