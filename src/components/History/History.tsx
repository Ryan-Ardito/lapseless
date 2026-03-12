import { useState } from 'react';
import {
  Stack, Title, Group, Button, Text, Paper, Badge, ActionIcon, Modal,
} from '@mantine/core';
import {
  IconPlus, IconPencil, IconTrash, IconCheck, IconArrowBack,
  IconHistory, IconArrowBackUp, IconArrowForwardUp, IconTrashX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useHistory } from '../../hooks/useHistory';
import type { HistoryAction, EntityType } from '../../types/history';

dayjs.extend(relativeTime);

const ACTION_CONFIG: Record<HistoryAction, { icon: typeof IconPlus; color: string; label: string }> = {
  create: { icon: IconPlus, color: 'teal', label: 'Created' },
  update: { icon: IconPencil, color: 'blue', label: 'Updated' },
  delete: { icon: IconTrash, color: 'red', label: 'Deleted' },
  complete: { icon: IconCheck, color: 'green', label: 'Completed' },
  uncomplete: { icon: IconArrowBack, color: 'gray', label: 'Uncompleted' },
};

const ENTITY_LABELS: Record<EntityType, string> = {
  obligation: 'Obligation',
  checklist: 'Checklist',
  'pto-entry': 'PTO',
  document: 'Document',
};

const ENTITY_COLORS: Record<EntityType, string> = {
  obligation: 'sage',
  checklist: 'grape',
  'pto-entry': 'teal',
  document: 'orange',
};

export function History() {
  const { history, isLoading, undo, redo, clearHistory } = useHistory();
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const visible = history.slice(0, visibleCount);
  const hasMore = history.length > visibleCount;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Activity History</Title>
        {history.length > 0 && (
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrashX size={14} />}
            onClick={() => setClearModalOpen(true)}
          >
            Clear History
          </Button>
        )}
      </Group>

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
                style={{ opacity: entry.undone ? 0.5 : 1 }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <ActionIcon
                      variant="light"
                      color={config.color}
                      size="md"
                      radius="xl"
                      style={{ flexShrink: 0 }}
                    >
                      <Icon size={14} />
                    </ActionIcon>

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
                    onClick={() => (entry.undone ? redo(entry) : undo(entry))}
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

      <Modal
        opened={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Clear History"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete all activity history. This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" onClick={() => setClearModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              size="sm"
              onClick={() => {
                clearHistory();
                setClearModalOpen(false);
              }}
            >
              Clear All
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
