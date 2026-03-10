import { useState } from 'react';
import {
  Card, Text, Group, Button, SimpleGrid, Stack, Badge, Paper, Title,
  Modal, TextInput, Select, Checkbox, Textarea, NumberInput, Progress, Anchor,
} from '@mantine/core';
import { IconClipboardList } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Obligation, Status, Category, Channel } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative, statusSortValue } from '../../utils/dates';
import { createSeedData } from '../../utils/seedData';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { DocumentUpload } from '../DocumentUpload/DocumentUpload';
import { CATEGORIES } from '../../constants/categories';
import { STATUS_COLORS, STATUS_BORDERS, CHANNELS } from '../../constants/theme';

interface DashboardProps {
  obligations: Obligation[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => void;
  onLoadSeed: (data: Obligation[]) => void;
}

export function Dashboard({ obligations, onToggleComplete, onDelete, onUpdate, onLoadSeed }: DashboardProps) {
  const isMobile = useIsMobile();
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
            <IconClipboardList size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
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
                  className="hover-lift"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: STATUS_BORDERS[status],
                    opacity: status === 'completed' ? 0.65 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => openDetail(ob)}
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
                      <Badge variant="light" color="indigo" size="sm">
                        {ob.recurrence.type}
                      </Badge>
                    )}
                    <Text size="sm" c="dimmed">{formatDate(ob.dueDate)}</Text>
                    <Text size="sm" c="dimmed">{formatRelative(ob.dueDate)}</Text>
                  </Group>

                  {ob.ceuTracking && (
                    <Progress
                      value={(ob.ceuTracking.completed / ob.ceuTracking.required) * 100}
                      size="sm"
                      color="indigo"
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

      {/* Detail / Edit Modal */}
      <Modal
        opened={selected !== null}
        onClose={closeModal}
        title={editing ? 'Edit Obligation' : selected?.name}
        size="lg"
        centered
        fullScreen={isMobile}
      >
        {selected && !editing && (() => {
          const status = getObligationStatus(selected.dueDate, selected.completed);
          return (
            <Stack gap="md">
              <Group>
                <StatusBadge status={status} />
                <Badge variant="light" color="gray" size="sm" tt="capitalize">
                  {selected.category}
                </Badge>
                {selected.recurrence && (
                  <Badge variant="light" color="indigo" size="sm">
                    {selected.recurrence.type}{selected.recurrence.autoRenew ? ' (auto-renew)' : ''}
                  </Badge>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Due Date</Text>
                  <Text size="sm">{formatDate(selected.dueDate)}</Text>
                  <Text size="xs" c="dimmed">{formatRelative(selected.dueDate)}</Text>
                </div>
                {selected.startDate && (
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Start Date</Text>
                    <Text size="sm">{formatDate(selected.startDate)}</Text>
                  </div>
                )}
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reminder</Text>
                  <Text size="sm">{selected.notification.reminderDaysBefore} days before</Text>
                  {selected.notification.reminderFrequency && selected.notification.reminderFrequency !== 'once' && (
                    <Text size="xs" c="dimmed">Repeats {selected.notification.reminderFrequency}</Text>
                  )}
                </div>
              </SimpleGrid>

              {selected.referenceNumber && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reference Number</Text>
                  <Text size="sm">{selected.referenceNumber}</Text>
                </div>
              )}

              {selected.ceuTracking && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>CEU Progress</Text>
                  <Progress
                    value={(selected.ceuTracking.completed / selected.ceuTracking.required) * 100}
                    size="lg"
                    color="indigo"
                    mt={4}
                  />
                  <Text size="sm" mt={4}>
                    {selected.ceuTracking.completed} of {selected.ceuTracking.required} hours completed
                  </Text>
                </div>
              )}

              {selected.notes && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Notes</Text>
                  <Text size="sm">{selected.notes}</Text>
                </div>
              )}

              {selected.links && selected.links.length > 0 && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Links</Text>
                  <Stack gap={4} mt={4}>
                    {selected.links.map((link, i) => (
                      <Anchor key={i} href={link.url} target="_blank" size="sm">
                        {link.label || link.url}
                      </Anchor>
                    ))}
                  </Stack>
                </div>
              )}

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Notification Channels</Text>
                <Group gap={6}>
                  {selected.notification.channels.map((ch) => (
                    <Badge key={ch} variant="light" color="blue" size="sm" tt="uppercase">
                      {ch}
                    </Badge>
                  ))}
                </Group>
              </div>

              {selected.documents && selected.documents.length > 0 && (
                <DocumentUpload
                  documents={selected.documents}
                  onChange={(docs) => {
                    onUpdate(selected.id, { documents: docs });
                    setSelected({ ...selected, documents: docs });
                  }}
                />
              )}

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
                      key={ch.value}
                      label={ch.label}
                      checked={editChannels.includes(ch.value)}
                      onChange={() => toggleEditChannel(ch.value)}
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
