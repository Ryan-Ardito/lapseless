import { useState } from 'react';
import {
  Stack, Title, Group, Button, Text, Paper, Badge, ActionIcon, ThemeIcon,
} from '@mantine/core';
import { notify } from '../../utils/notify';
import {
  IconHistory, IconArrowBackUp, IconArrowForwardUp, IconTrashX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useHistory } from '../../hooks/useHistory';
import { useOrgContext } from '../../contexts/OrgContext';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';
import { HistoryDetailDrawer } from './HistoryDetailDrawer';
import { ACTION_CONFIG, ENTITY_LABELS, ENTITY_COLORS } from './constants';

dayjs.extend(relativeTime);

export function History() {
  const { history, isLoading, undo, redo, clearHistory } = useHistory();
  const { canManageMembers } = useOrgContext();
  const [visibleCount, setVisibleCount] = useState(50);
  const { value: selectedEntryId, open: openEntry, close: closeEntry } = useModalSearchParam('historyEntryId');
  const selectedEntry = selectedEntryId ? history.find((e) => e.id === selectedEntryId) ?? null : null;

  const visible = history.slice(0, visibleCount);
  const hasMore = history.length > visibleCount;

  return (
    <Stack gap="lg">
      {history.length > 0 && (
        <Group justify="flex-end">
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrashX size={14} />}
            onClick={() => {
              clearHistory();
              notify.success('History cleared');
            }}
          >
            Clear History
          </Button>
        </Group>
      )}

      {isLoading ? null : history.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="md">
            <IconHistory size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={3} c="dark">No activity yet</Title>
            <Text c="dimmed" size="md">
              Your actions will appear here as you create, edit, and manage your data.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="xs">
          {visible.map((entry) => {
            const config = ACTION_CONFIG[entry.action];
            const Icon = config.icon;

            return (
              <Paper
                key={entry.id}
                p="sm"
                withBorder
                radius="md"
                className="hover-row"
                style={{ cursor: 'pointer', opacity: entry.undone ? 0.5 : 1 }}
                onClick={() => openEntry(entry.id)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ThemeIcon
                      variant="light"
                      color={config.color}
                      size="md"
                      radius="xl"
                      style={{ flexShrink: 0 }}
                    >
                      <Icon size={14} />
                    </ThemeIcon>

                    <div style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text
                          size="sm"
                          fw={500}
                          truncate
                          style={{ textDecoration: entry.undone ? 'line-through' : undefined }}
                        >
                          {config.label} {entry.entityName}
                        </Text>
                      </Group>
                      <Group gap={6} mt={2}>
                        <Badge
                          size="xs"
                          variant="light"
                          color={ENTITY_COLORS[entry.entityType]}
                        >
                          {ENTITY_LABELS[entry.entityType]}
                        </Badge>
                        {canManageMembers && entry.userName && (
                          <Text size="xs" c="dimmed" fw={500}>
                            {entry.userName}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed">
                          {dayjs(entry.timestamp).fromNow()}
                        </Text>
                      </Group>
                    </div>
                  </Group>

                  <ActionIcon
                    variant="subtle"
                    color={entry.undone ? 'blue' : 'gray'}
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      entry.undone ? redo(entry) : undo(entry);
                    }}
                    title={entry.undone ? 'Redo' : 'Undo'}
                    style={{ flexShrink: 0 }}
                  >
                    {entry.undone ? <IconArrowForwardUp size={16} /> : <IconArrowBackUp size={16} />}
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}

          {hasMore && (
            <Button
              variant="subtle"
              size="sm"
              fullWidth
              onClick={() => setVisibleCount((c) => c + 50)}
            >
              Load more ({history.length - visibleCount} remaining)
            </Button>
          )}
        </Stack>
      )}

      <HistoryDetailDrawer entry={selectedEntry} onClose={closeEntry} />
    </Stack>
  );
}
