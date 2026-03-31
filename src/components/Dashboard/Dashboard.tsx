import { useState } from 'react';
import {
  Text, Group, Button, Stack, Badge, Paper, Title, Progress, ActionIcon, Chip,
} from '@mantine/core';
import { IconClipboardList, IconPlus, IconMinus, IconBellOff } from '@tabler/icons-react';
import { useObligations } from '../../hooks/useObligations';
import { usePTO } from '../../hooks/usePTO';
import { useChecklists } from '../../hooks/useChecklists';
import { useDocuments } from '../../hooks/useDocuments';
import type { Status } from '../../types/obligation';
import { getObligationStatus, formatDate, statusSortValue } from '../../utils/dates';
import { createSeedData, createSeedPTOData, createSeedChecklistData, createSeedDocumentData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { ObligationForm } from '../ObligationForm/ObligationForm';
import { ObligationDetailModal } from '../ObligationDetailModal/ObligationDetailModal';
import { DashboardSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import { STATUS_COLORS, STATUS_BORDERS } from '../../constants/theme';
import { useAppMode } from '../../contexts/AppModeContext';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';

export function Dashboard() {
  const mode = useAppMode();
  const { obligations, isLoading, isError, error, refetch, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData } = useObligations();
  const { loadSeedData: loadPTOSeedData } = usePTO(new Date().getFullYear());
  const { loadSeedData: loadChecklistSeedData } = useChecklists();
  const { loadSeedData: loadDocSeedData } = useDocuments();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Status[]>([]);
  const { value: selectedId, open: openObligation, close: closeObligation } = useModalSearchParam('obligationId');
  const selected = selectedId ? obligations.find((o) => o.id === selectedId) ?? null : null;

  const sorted = [...obligations].sort((a, b) => {
    const sa = getObligationStatus(a.dueDate, a.completed);
    const sb = getObligationStatus(b.dueDate, b.completed);
    const diff = statusSortValue(sa) - statusSortValue(sb);
    if (diff !== 0) return diff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const filtered = statusFilters.length > 0
    ? sorted.filter((ob) => statusFilters.includes(getObligationStatus(ob.dueDate, ob.completed)))
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
    <Stack gap="md">
      {sorted.length === 0 ? (
        <>
          <Group justify="flex-end">
            <Button size="sm" onClick={() => setAddModalOpen(true)} leftSection={<IconPlus size={16} />}>
              Add Obligation
            </Button>
          </Group>
          <Paper p={60} ta="center" withBorder radius="lg">
            <Stack align="center" gap="md">
              <IconClipboardList size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
              <Title order={3} c="dark">No obligations yet</Title>
              <Text c="dimmed" size="md">
                {mode === 'demo' ? 'Add your first obligation or load demo data to get started.' : 'Add your first obligation to get started.'}
              </Text>
              {mode === 'demo' && (
                <Button size="md" onClick={() => {
                  loadSeedData(createSeedData());
                  loadPTOSeedData(createSeedPTOData());
                  loadChecklistSeedData(createSeedChecklistData());
                  loadDocSeedData(createSeedDocumentData());
                }}>
                  Load Demo Data
                </Button>
              )}
            </Stack>
          </Paper>
        </>
      ) : (
        <>
          <Group justify="space-between" wrap="wrap">
            <Chip.Group multiple value={statusFilters} onChange={(val) => setStatusFilters(val as Status[])}>
              <Group gap="xs" wrap="wrap">
                {([
                  ['overdue', 'Overdue'],
                  ['due-soon', 'Due Soon'],
                  ['upcoming', 'Upcoming'],
                  ['completed', 'Completed'],
                ] as [Status, string][]).map(([key, label]) => (
                  <Chip
                    key={key}
                    value={key}
                    variant="outline"
                    color={STATUS_COLORS[key]}
                    size="sm"
                  >
                    {label} ({counts[key]})
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <Button size="sm" onClick={() => setAddModalOpen(true)} leftSection={<IconPlus size={16} />}>
              Add
            </Button>
          </Group>

          <Stack gap="xs">
            {filtered.map((ob) => {
              const status = getObligationStatus(ob.dueDate, ob.completed);
              return (
                <Paper
                  key={ob.id}
                  p="sm"
                  radius="md"
                  withBorder
                  className="hover-row"
                  style={{
                    cursor: 'pointer',
                    opacity: status === 'completed' ? 0.65 : 1,
                  }}
                  onClick={() => openObligation(ob.id)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 4,
                          alignSelf: 'stretch',
                          borderRadius: 2,
                          backgroundColor: STATUS_BORDERS[status],
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={500} size="sm" truncate>{ob.name}</Text>
                          {ob.notification.muted && (
                            <IconBellOff size={14} color="var(--mantine-color-orange-5)" style={{ flexShrink: 0 }} />
                          )}
                        </Group>
                        {ob.ceuTracking && (
                          <Group gap="xs" mt={2} align="center" wrap="nowrap">
                            <Progress
                              value={(ob.ceuTracking.completed / ob.ceuTracking.required) * 100}
                              size={4}
                              color="sage"
                              style={{ flex: 1, maxWidth: 120 }}
                            />
                            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                              {ob.ceuTracking.completed}/{ob.ceuTracking.required}h
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="xs"
                              disabled={ob.ceuTracking.completed <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newCompleted = Math.max(Math.round((ob.ceuTracking!.completed - 0.5) * 100) / 100, 0);
                                updateObligation(ob.id, {
                                  ceuTracking: { ...ob.ceuTracking!, completed: newCompleted },
                                });
                              }}
                            >
                              <IconMinus size={12} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="sage"
                              size="xs"
                              disabled={ob.ceuTracking.completed >= ob.ceuTracking.required}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newCompleted = Math.min(Math.round((ob.ceuTracking!.completed + 0.5) * 100) / 100, ob.ceuTracking!.required);
                                updateObligation(ob.id, {
                                  ceuTracking: { ...ob.ceuTracking!, completed: newCompleted },
                                });
                              }}
                            >
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Group>
                        )}
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Badge variant="light" color="gray" size="xs" tt="capitalize">
                        {ob.category}
                      </Badge>
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{formatDate(ob.dueDate)}</Text>
                      <StatusBadge status={status} />
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}

      <ObligationDetailModal
        obligation={selected}
        onClose={closeObligation}
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
