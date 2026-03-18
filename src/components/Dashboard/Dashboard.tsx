import { useState } from 'react';
import {
  Card, Text, Group, Button, SimpleGrid, Stack, Badge, Paper, Title, Progress,
} from '@mantine/core';
import { IconClipboardList, IconPlus, IconBellOff } from '@tabler/icons-react';
import { useObligations } from '../../hooks/useObligations';
import { usePTO } from '../../hooks/usePTO';
import { useChecklists } from '../../hooks/useChecklists';
import { useDocuments } from '../../hooks/useDocuments';
import type { Status } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative, statusSortValue } from '../../utils/dates';
import { createSeedData, createSeedPTOData, createSeedChecklistData, createSeedDocumentData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { ObligationForm } from '../ObligationForm/ObligationForm';
import { ObligationDetailModal } from '../ObligationDetailModal/ObligationDetailModal';
import { DashboardSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import { STATUS_COLORS, STATUS_BORDERS } from '../../constants/theme';

export function Dashboard() {
  const { obligations, isLoading, isError, error, refetch, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData } = useObligations();
  const { loadSeedData: loadPTOSeedData } = usePTO(new Date().getFullYear());
  const { loadSeedData: loadChecklistSeedData } = useChecklists();
  const { loadSeedData: loadDocSeedData } = useDocuments();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? obligations.find((o) => o.id === selectedId) ?? null : null;

  const sorted = [...obligations].sort((a, b) => {
    const sa = getObligationStatus(a.dueDate, a.completed);
    const sb = getObligationStatus(b.dueDate, b.completed);
    const diff = statusSortValue(sa) - statusSortValue(sb);
    if (diff !== 0) return diff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const filtered = statusFilter
    ? sorted.filter((ob) => getObligationStatus(ob.dueDate, ob.completed) === statusFilter)
    : sorted;

  const counts = obligations.reduce(
    (acc, ob) => {
      const s = getObligationStatus(ob.dueDate, ob.completed);
      acc[s]++;
      return acc;
    },
    { overdue: 0, 'due-soon': 0, upcoming: 0, completed: 0 } as Record<Status, number>,
  );

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Your Obligations</Title>
        <Button size="sm" onClick={() => setAddModalOpen(true)} leftSection={<IconPlus size={16} />}>
          Add Obligation
        </Button>
      </Group>

      {sorted.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="md">
            <IconClipboardList size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={3} c="dark">No obligations yet</Title>
            <Text c="dimmed" size="md">
              Add your first obligation or load demo data to get started.
            </Text>
            <Button size="md" onClick={() => {
              loadSeedData(createSeedData());
              loadPTOSeedData(createSeedPTOData());
              loadChecklistSeedData(createSeedChecklistData());
              loadDocSeedData(createSeedDocumentData());
            }}>
              Load Demo Data
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            {([
              ['overdue', 'Overdue'],
              ['due-soon', 'Due Soon'],
              ['upcoming', 'Upcoming'],
              ['completed', 'Completed'],
            ] as [Status, string][]).map(([key, label]) => (
              <Paper
                key={key}
                p="md"
                radius="md"
                withBorder
                shadow={statusFilter === key ? 'md' : 'xs'}
                style={{
                  cursor: 'pointer',
                  borderColor: statusFilter === key ? `var(--mantine-color-${STATUS_COLORS[key]}-5)` : undefined,
                  background: statusFilter === key ? `var(--mantine-color-${STATUS_COLORS[key]}-0)` : undefined,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              >
                <Text
                  ta="center"
                  size="1.75rem"
                  fw={800}
                  lh={1}
                  c={`${STATUS_COLORS[key]}.6`}
                >
                  {counts[key]}
                </Text>
                <Text ta="center" size="xs" c="dimmed" tt="uppercase" fw={600} mt={4}>
                  {label}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {filtered.map((ob) => {
              const status = getObligationStatus(ob.dueDate, ob.completed);
              return (
                <Card
                  key={ob.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  className="hover-lift"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: STATUS_BORDERS[status],
                    opacity: status === 'completed' ? 0.65 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedId(ob.id)}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="md">{ob.name}</Text>
                    <StatusBadge status={status} />
                  </Group>

                  <Group gap="md" mb="xs">
                    <Badge variant="light" color="gray" size="sm" tt="capitalize">
                      {ob.category}
                    </Badge>
                    {ob.recurrence && (
                      <Badge variant="light" color="sage" size="sm">
                        {ob.recurrence.type}
                      </Badge>
                    )}
                    {ob.notification.muted && (
                      <Badge variant="light" color="orange" size="sm" leftSection={<IconBellOff size={12} />}>
                        Muted
                      </Badge>
                    )}
                    <Text size="sm" c="dimmed">{formatDate(ob.dueDate)}</Text>
                    <Text size="sm" c="dimmed">{formatRelative(ob.dueDate)}</Text>
                  </Group>

                  {ob.ceuTracking && (
                    <Progress
                      value={(ob.ceuTracking.completed / ob.ceuTracking.required) * 100}
                      size="sm"
                      color="sage"
                      mb="xs"
                    />
                  )}

                  {ob.notes && (
                    <Text size="sm" c="dimmed" lineClamp={2}>{ob.notes}</Text>
                  )}
                </Card>
              );
            })}
          </SimpleGrid>
        </>
      )}

      <ObligationDetailModal
        obligation={selected}
        onClose={() => setSelectedId(null)}
        updateObligation={updateObligation}
        deleteObligation={deleteObligation}
        toggleComplete={toggleComplete}
      />

      <ObligationForm
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={addObligation}
      />
    </Stack>
  );
}
