import { Drawer, Stack, Group, Badge, Text, ThemeIcon, Code } from '@mantine/core';
import dayjs from 'dayjs';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ACTION_CONFIG, ENTITY_LABELS, ENTITY_COLORS } from './constants';
import type { HistoryEntry } from '../../types/history';

const HIDDEN_FIELDS = new Set([
  'id', 'createdAt', 'updatedAt', 'orgId', 'userId', 'deletedAt',
]);

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) {
      return dayjs(value).format('MMM D, YYYY h:mm A');
    }
    return value;
  }
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value, null, 2);
}

function getChangedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { key: string; oldValue: unknown; newValue: unknown }[] {
  if (!before || !after) return [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: { key: string; oldValue: unknown; newValue: unknown }[] = [];
  for (const key of allKeys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push({ key, oldValue: before[key], newValue: after[key] });
    }
  }
  return changed;
}

function renderSnapshot(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([key]) => !HIDDEN_FIELDS.has(key));
  if (entries.length === 0) return <Text size="sm" c="dimmed">No data</Text>;
  return (
    <Stack gap="xs">
      {entries.map(([key, value]) => (
        <div key={key}>
          <Text size="xs" c="dimmed" fw={500}>{humanizeKey(key)}</Text>
          {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
            <Code block>{formatValue(value)}</Code>
          ) : (
            <Text size="sm">{formatValue(value)}</Text>
          )}
        </div>
      ))}
    </Stack>
  );
}

interface HistoryDetailDrawerProps {
  entry: HistoryEntry | null;
  onClose: () => void;
}

export function HistoryDetailDrawer({ entry, onClose }: HistoryDetailDrawerProps) {
  const isMobile = useIsMobile();

  const config = entry ? ACTION_CONFIG[entry.action] : null;
  const Icon = config?.icon;
  const changedFields = entry?.action === 'update' ? getChangedFields(entry.before, entry.after) : [];

  return (
    <Drawer
      opened={entry !== null}
      onClose={onClose}
      title={entry && config ? `${config.label} ${entry.entityName}` : undefined}
      position="right"
      size={isMobile ? '100%' : 'lg'}
      overlayProps={{ backgroundOpacity: 0.3 }}
    >
      {entry && config && Icon && (
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon variant="light" color={config.color} size="md" radius="xl">
              <Icon size={14} />
            </ThemeIcon>
            <Badge variant="light" color={ENTITY_COLORS[entry.entityType]} size="sm">
              {ENTITY_LABELS[entry.entityType]}
            </Badge>
            {entry.undone && (
              <Badge variant="light" color="orange" size="sm">Undone</Badge>
            )}
          </Group>

          <Group gap="xs">
            {entry.userName && (
              <Text size="sm" c="dimmed">by <Text span fw={500}>{entry.userName}</Text></Text>
            )}
            <Text size="sm" c="dimmed">{dayjs(entry.timestamp).format('MMM D, YYYY h:mm A')}</Text>
          </Group>

          {entry.action === 'update' && (
            <>
              <Text size="sm" fw={600}>Changes</Text>
              {changedFields.length === 0 ? (
                <Text size="sm" c="dimmed">No field changes recorded</Text>
              ) : (
                <Stack gap="sm">
                  {changedFields.map(({ key, oldValue, newValue }) => (
                    <div key={key}>
                      <Text size="xs" c="dimmed" fw={500} mb={2}>{humanizeKey(key)}</Text>
                      <Text size="sm" c="red" td="line-through">{formatValue(oldValue)}</Text>
                      <Text size="sm" c="teal">{formatValue(newValue)}</Text>
                    </div>
                  ))}
                </Stack>
              )}
            </>
          )}

          {entry.action === 'create' && entry.after && (
            <>
              <Text size="sm" fw={600}>Created State</Text>
              {renderSnapshot(entry.after)}
            </>
          )}

          {entry.action === 'delete' && entry.before && (
            <>
              <Text size="sm" fw={600}>Deleted State</Text>
              {renderSnapshot(entry.before)}
            </>
          )}

          {(entry.action === 'complete' || entry.action === 'uncomplete') && (
            <>
              <Text size="sm" fw={600}>
                {entry.action === 'complete' ? 'Marked as Complete' : 'Marked as Incomplete'}
              </Text>
              {entry.after && renderSnapshot(entry.after)}
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
