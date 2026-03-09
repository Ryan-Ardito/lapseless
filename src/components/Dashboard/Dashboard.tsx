import { useState } from 'react';
import {
  Card, Text, Group, Button, SimpleGrid, Stack, Badge, Paper, Title,
  Modal, TextInput, Select, Checkbox, Textarea, NumberInput,
} from '@mantine/core';
import toast from 'react-hot-toast';
import type { Obligation, Status, Category, Channel } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative, statusSortValue } from '../../utils/dates';
import { createSeedData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';

interface DashboardProps {
  obligations: Obligation[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => void;
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

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'license', label: 'License' },
  { value: 'ceu', label: 'CEU' },
  { value: 'tax', label: 'Tax' },
  { value: 'certification', label: 'Certification' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const CHANNELS: Channel[] = ['sms', 'email', 'whatsapp'];

export function Dashboard({ obligations, onToggleComplete, onDelete, onUpdate, onLoadSeed }: DashboardProps) {
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('license');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editChannels, setEditChannels] = useState<Channel[]>([]);
  const [editReminderDays, setEditReminderDays] = useState<number>(14);

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

  function openDetail(ob: Obligation) {
    setSelected(ob);
    setEditing(false);
  }

  function startEditing() {
    if (!selected) return;
    setEditName(selected.name);
    setEditCategory(selected.category);
    setEditDueDate(selected.dueDate);
    setEditNotes(selected.notes);
    setEditChannels([...selected.notification.channels]);
    setEditReminderDays(selected.notification.reminderDaysBefore);
    setEditing(true);
  }

  function saveEdit() {
    if (!selected) return;
    if (!editName.trim()) return;
    if (!editDueDate) return;
    if (editChannels.length === 0) return;

    onUpdate(selected.id, {
      name: editName.trim(),
      category: editCategory,
      dueDate: editDueDate,
      notes: editNotes.trim(),
      notification: { channels: editChannels, reminderDaysBefore: editReminderDays },
    });

    toast.success(`"${editName.trim()}" updated!`);
    // Update the selected obligation in local state so modal reflects the change
    setSelected({
      ...selected,
      name: editName.trim(),
      category: editCategory,
      dueDate: editDueDate,
      notes: editNotes.trim(),
      notification: { channels: editChannels, reminderDaysBefore: editReminderDays },
    });
    setEditing(false);
  }

  function toggleEditChannel(ch: Channel) {
    setEditChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
  }

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
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--mantine-shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  onClick={() => openDetail(ob)}
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
                    <Text size="sm" c="dimmed" lineClamp={2}>{ob.notes}</Text>
                  )}
                </Card>
              );
            })}
          </SimpleGrid>
        </>
      )}

      {/* Detail / Edit Modal */}
      <Modal
        opened={selected !== null}
        onClose={closeModal}
        title={editing ? 'Edit Obligation' : selected?.name}
        size="lg"
        centered
      >
        {selected && !editing && (() => {
          const status = getObligationStatus(selected.dueDate, selected.completed);
          return (
            <Stack gap="md">
              <Group>
                <StatusBadge status={status} />
                <Badge variant="light" color="gray" size="sm" radius="xl" tt="capitalize">
                  {selected.category}
                </Badge>
              </Group>

              <SimpleGrid cols={2}>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Due Date</Text>
                  <Text size="sm">{formatDate(selected.dueDate)}</Text>
                  <Text size="xs" c="dimmed">{formatRelative(selected.dueDate)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reminder</Text>
                  <Text size="sm">{selected.notification.reminderDaysBefore} days before</Text>
                </div>
              </SimpleGrid>

              {selected.notes && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Notes</Text>
                  <Text size="sm">{selected.notes}</Text>
                </div>
              )}

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Notification Channels</Text>
                <Group gap={6}>
                  {selected.notification.channels.map((ch) => (
                    <Badge key={ch} variant="light" color="violet" size="sm" radius="xl" tt="uppercase">
                      {ch}
                    </Badge>
                  ))}
                </Group>
              </div>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Created</Text>
                <Text size="sm">{formatDate(selected.createdAt)}</Text>
              </div>

              <Group gap="xs" mt="md">
                <Button size="sm" onClick={startEditing}>
                  Edit
                </Button>
                <Button
                  variant={selected.completed ? 'default' : 'light'}
                  color={selected.completed ? 'gray' : 'teal'}
                  size="sm"
                  onClick={() => {
                    onToggleComplete(selected.id);
                    setSelected({ ...selected, completed: !selected.completed });
                  }}
                >
                  {selected.completed ? 'Undo' : 'Complete'}
                </Button>
                <Button
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => {
                    onDelete(selected.id);
                    closeModal();
                  }}
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          );
        })()}

        {selected && editing && (
          <Stack gap="md">
            <TextInput
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Category"
                data={CATEGORIES}
                value={editCategory}
                onChange={(val) => val && setEditCategory(val as Category)}
                allowDeselect={false}
              />
              <TextInput
                label="Due Date"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <div>
                <Text size="sm" fw={500} mb={4}>Notification Channels</Text>
                <Group gap="lg">
                  {CHANNELS.map((ch) => (
                    <Checkbox
                      key={ch}
                      label={ch.charAt(0).toUpperCase() + ch.slice(1)}
                      checked={editChannels.includes(ch)}
                      onChange={() => toggleEditChannel(ch)}
                    />
                  ))}
                </Group>
              </div>
              <NumberInput
                label="Remind me (days before)"
                min={1}
                max={365}
                value={editReminderDays}
                onChange={(val) => setEditReminderDays(Number(val))}
              />
            </SimpleGrid>

            <Textarea
              label="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              minRows={3}
              autosize
            />

            <Group gap="xs" mt="xs">
              <Button size="sm" onClick={saveEdit}>
                Save
              </Button>
              <Button variant="default" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
