import { useState } from 'react';
import {
  Card, Text, Group, Button, SimpleGrid, Stack, Badge, Paper, Title,
} from '@mantine/core';
import type { Obligation, Status } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative, statusSortValue } from '../../utils/dates';
import { createSeedData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';

interface DashboardProps {
  obligations: Obligation[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onLoadSeed: (data: Obligation[]) => void;
}

const STATUS_COLORS: Record<Status, string> = {
  overdue: 'red',
  'due-soon': 'yellow',
  upcoming: 'teal',
  completed: 'gray',
};

const STATUS_BORDER: Record<Status, string> = {
  overdue: 'var(--mantine-color-red-5)',
  'due-soon': 'var(--mantine-color-yellow-5)',
  upcoming: 'var(--mantine-color-teal-5)',
  completed: 'var(--mantine-color-gray-4)',
};

export function Dashboard({ obligations, onToggleComplete, onDelete, onLoadSeed }: DashboardProps) {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

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

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Your Obligations</Title>
        <Button variant="default" size="sm" onClick={() => onLoadSeed(createSeedData())}>
          Load Demo Data
        </Button>
      </Group>

      {sorted.length === 0 ? (
        <Paper p={60} ta="center" withBorder radius="lg">
          <Stack align="center" gap="md">
            <Text size="3rem">📋</Text>
            <Title order={3} c="dark">No obligations yet</Title>
            <Text c="dimmed" size="md">
              Add your first obligation or load demo data to get started.
            </Text>
            <Button size="md" onClick={() => onLoadSeed(createSeedData())}>
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
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: STATUS_BORDER[status],
                    opacity: status === 'completed' ? 0.65 : 1,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--mantine-shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="md">{ob.name}</Text>
                    <StatusBadge status={status} />
                  </Group>

                  <Group gap="md" mb="xs">
                    <Badge variant="light" color="gray" size="sm" radius="xl" tt="capitalize">
                      {ob.category}
                    </Badge>
                    <Text size="sm" c="dimmed">{formatDate(ob.dueDate)}</Text>
                    <Text size="sm" c="dimmed">{formatRelative(ob.dueDate)}</Text>
                  </Group>

                  {ob.notes && (
                    <Text size="sm" c="dimmed" mb="sm">{ob.notes}</Text>
                  )}

                  <Group gap={6} mb="sm">
                    {ob.notification.channels.map((ch) => (
                      <Badge key={ch} variant="light" color="violet" size="xs" radius="xl" tt="uppercase">
                        {ch}
                      </Badge>
                    ))}
                  </Group>

                  <Group gap="xs">
                    <Button
                      variant={ob.completed ? 'default' : 'light'}
                      color={ob.completed ? 'gray' : 'teal'}
                      size="xs"
                      onClick={() => onToggleComplete(ob.id)}
                    >
                      {ob.completed ? 'Undo' : 'Complete'}
                    </Button>
                    <Button
                      variant="light"
                      color="red"
                      size="xs"
                      onClick={() => onDelete(ob.id)}
                    >
                      Delete
                    </Button>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
