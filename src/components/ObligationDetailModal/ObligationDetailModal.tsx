import { useState } from 'react';
import {
  Text, Group, Button, SimpleGrid, Stack, Badge,
  Modal, TextInput, Select, Checkbox, Textarea, NumberInput, Progress, Anchor, ActionIcon,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Obligation, Category, Channel, DocumentMeta } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative } from '../../utils/dates';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { DocumentUpload } from '../DocumentUpload/DocumentUpload';
import { CATEGORIES } from '../../constants/categories';
import { CHANNELS } from '../../constants/theme';

const RECURRENCE_CATEGORIES: Category[] = ['tax', 'credit-card', 'mailbox', 'insurance', 'license'];
const REFERENCE_CATEGORIES: Category[] = ['license', 'insurance', 'certification'];

interface ObligationDetailModalProps {
  obligation: Obligation | null;
  onClose: () => void;
  updateObligation: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => void;
  deleteObligation: (id: string) => void;
  toggleComplete: (id: string) => void;
}

export function ObligationDetailModal({
  obligation,
  onClose,
  updateObligation,
  deleteObligation,
  toggleComplete,
}: ObligationDetailModalProps) {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [editing, setEditing] = useState(false);
  const [modalFullScreen, setModalFullScreen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('license');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editChannels, setEditChannels] = useState<Channel[]>([]);
  const [editReminderDays, setEditReminderDays] = useState<number>(14);
  const [editDocuments, setEditDocuments] = useState<DocumentMeta[]>([]);
  const [editStartDate, setEditStartDate] = useState('');
  const [editReferenceNumber, setEditReferenceNumber] = useState('');
  const [editLinks, setEditLinks] = useState<{ label: string; url: string }[]>([]);
  const [editHasRecurrence, setEditHasRecurrence] = useState(false);
  const [editRecurrenceType, setEditRecurrenceType] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [editCeuRequired, setEditCeuRequired] = useState<number>(0);
  const [editCeuCompleted, setEditCeuCompleted] = useState<number>(0);
  const [editReminderFrequency, setEditReminderFrequency] = useState<'once' | 'daily' | 'weekly'>('once');

  // Sync the prop into local state when a new obligation is opened
  const displayed = obligation ?? selected;
  if (obligation && obligation.id !== selected?.id) {
    setSelected(obligation);
    setEditing(false);
    setModalFullScreen(!!isMobile);
  }

  function startEditing() {
    if (!displayed) return;
    setEditName(displayed.name);
    setEditCategory(displayed.category);
    setEditDueDate(displayed.dueDate);
    setEditNotes(displayed.notes);
    setEditChannels([...displayed.notification.channels]);
    setEditReminderDays(displayed.notification.reminderDaysBefore);
    setEditDocuments(displayed.documents ?? []);
    setEditStartDate(displayed.startDate ?? '');
    setEditReferenceNumber(displayed.referenceNumber ?? '');
    setEditLinks(displayed.links ? displayed.links.map((l) => ({ ...l })) : []);
    setEditHasRecurrence(!!displayed.recurrence);
    setEditRecurrenceType(displayed.recurrence?.type ?? 'yearly');
    setEditAutoRenew(displayed.recurrence?.autoRenew ?? false);
    setEditCeuRequired(displayed.ceuTracking?.required ?? 0);
    setEditCeuCompleted(displayed.ceuTracking?.completed ?? 0);
    setEditReminderFrequency(displayed.notification.reminderFrequency ?? 'once');
    setEditing(true);
  }

  function saveEdit() {
    if (!displayed) return;
    if (!editName.trim()) return;
    if (!editDueDate) return;
    if (editChannels.length === 0) return;

    const filteredLinks = editLinks.filter((l) => l.label.trim() && l.url.trim());
    const updates: Partial<Omit<Obligation, 'id' | 'createdAt'>> = {
      name: editName.trim(),
      category: editCategory,
      dueDate: editDueDate,
      startDate: editStartDate || undefined,
      referenceNumber: editReferenceNumber.trim() || undefined,
      links: filteredLinks.length > 0 ? filteredLinks : undefined,
      recurrence: editHasRecurrence ? { type: editRecurrenceType, autoRenew: editAutoRenew } : undefined,
      ceuTracking: editCategory === 'ceu' && editCeuRequired > 0
        ? { required: editCeuRequired, completed: editCeuCompleted }
        : undefined,
      notes: editNotes.trim(),
      documents: editDocuments,
      notification: { channels: editChannels, reminderDaysBefore: editReminderDays, reminderFrequency: editReminderFrequency },
    };

    updateObligation(displayed.id, updates);

    toast.success(`"${editName.trim()}" updated!`);
    setSelected({ ...displayed, ...updates });
    setEditing(false);
  }

  function toggleEditChannel(ch: Channel) {
    setEditChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function handleClose() {
    setSelected(null);
    setEditing(false);
    onClose();
  }

  return (
    <Modal
      opened={obligation !== null}
      onClose={handleClose}
      title={editing ? 'Edit Obligation' : displayed?.name}
      size="lg"
      centered
      fullScreen={modalFullScreen}
    >
      {displayed && !editing && (() => {
        const status = getObligationStatus(displayed.dueDate, displayed.completed);
        return (
          <Stack gap="md">
            <Group>
              <StatusBadge status={status} />
              <Badge variant="light" color="gray" size="sm" tt="capitalize">
                {displayed.category}
              </Badge>
              {displayed.recurrence && (
                <Badge variant="light" color="sage" size="sm">
                  {displayed.recurrence.type}{displayed.recurrence.autoRenew ? ' (auto-renew)' : ''}
                </Badge>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Due Date</Text>
                <Text size="sm">{formatDate(displayed.dueDate)}</Text>
                <Text size="xs" c="dimmed">{formatRelative(displayed.dueDate)}</Text>
              </div>
              {displayed.startDate && (
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Start Date</Text>
                  <Text size="sm">{formatDate(displayed.startDate)}</Text>
                </div>
              )}
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reminder</Text>
                <Text size="sm">{displayed.notification.reminderDaysBefore} days before</Text>
                {displayed.notification.reminderFrequency && displayed.notification.reminderFrequency !== 'once' && (
                  <Text size="xs" c="dimmed">Repeats {displayed.notification.reminderFrequency}</Text>
                )}
              </div>
            </SimpleGrid>

            {displayed.referenceNumber && (
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reference Number</Text>
                <Text size="sm">{displayed.referenceNumber}</Text>
              </div>
            )}

            {displayed.ceuTracking && (
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>CEU Progress</Text>
                <Progress
                  value={(displayed.ceuTracking.completed / displayed.ceuTracking.required) * 100}
                  size="lg"
                  color="sage"
                  mt={4}
                />
                <Text size="sm" mt={4}>
                  {displayed.ceuTracking.completed} of {displayed.ceuTracking.required} hours completed
                </Text>
              </div>
            )}

            {displayed.notes && (
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Notes</Text>
                <Text size="sm">{displayed.notes}</Text>
              </div>
            )}

            {displayed.links && displayed.links.length > 0 && (
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Links</Text>
                <Stack gap={4} mt={4}>
                  {displayed.links.map((link, i) => (
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
                {displayed.notification.channels.map((ch) => (
                  <Badge key={ch} variant="light" color="teal" size="sm" tt="uppercase">
                    {ch}
                  </Badge>
                ))}
              </Group>
            </div>

            <DocumentUpload
              documents={displayed.documents ?? []}
              onChange={(docs) => {
                updateObligation(displayed.id, { documents: docs });
                setSelected({ ...displayed, documents: docs });
              }}
            />

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Created</Text>
              <Text size="sm">{formatDate(displayed.createdAt)}</Text>
            </div>

            <Group gap="xs" mt="md">
              <Button size="sm" onClick={startEditing}>
                Edit
              </Button>
              <Button
                variant={displayed.completed ? 'default' : 'light'}
                color={displayed.completed ? 'gray' : 'teal'}
                size="sm"
                onClick={() => {
                  toggleComplete(displayed.id);
                  setSelected({ ...displayed, completed: !displayed.completed });
                }}
              >
                {displayed.completed ? 'Undo' : 'Complete'}
              </Button>
              <Button
                variant="light"
                color="red"
                size="sm"
                onClick={() => {
                  deleteObligation(displayed.id);
                  handleClose();
                }}
              >
                Delete
              </Button>
            </Group>
          </Stack>
        );
      })()}

      {displayed && editing && (
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
            <TextInput
              label="Start Date"
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              placeholder="Optional"
            />
            {REFERENCE_CATEGORIES.includes(editCategory) && (
              <TextInput
                label="Reference Number"
                placeholder="e.g., License #, Policy #"
                value={editReferenceNumber}
                onChange={(e) => setEditReferenceNumber(e.target.value)}
              />
            )}
          </SimpleGrid>

          {RECURRENCE_CATEGORIES.includes(editCategory) && (
            <Stack gap="xs">
              <Checkbox
                label="Recurring obligation"
                checked={editHasRecurrence}
                onChange={(e) => setEditHasRecurrence(e.currentTarget.checked)}
              />
              {editHasRecurrence && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Frequency"
                    data={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'quarterly', label: 'Quarterly' },
                      { value: 'yearly', label: 'Yearly' },
                    ]}
                    value={editRecurrenceType}
                    onChange={(val) => val && setEditRecurrenceType(val as 'monthly' | 'quarterly' | 'yearly')}
                    allowDeselect={false}
                  />
                  <Checkbox
                    label="Auto-renew when completed"
                    checked={editAutoRenew}
                    onChange={(e) => setEditAutoRenew(e.currentTarget.checked)}
                    mt="xl"
                  />
                </SimpleGrid>
              )}
            </Stack>
          )}

          {editCategory === 'ceu' && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput
                label="CEU Hours Required"
                min={0}
                value={editCeuRequired}
                onChange={(val) => setEditCeuRequired(Number(val))}
              />
              <NumberInput
                label="CEU Hours Completed"
                min={0}
                max={editCeuRequired}
                value={editCeuCompleted}
                onChange={(val) => setEditCeuCompleted(Number(val))}
              />
            </SimpleGrid>
          )}

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

          <Select
            label="Reminder Frequency"
            data={[
              { value: 'once', label: 'Once' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            value={editReminderFrequency}
            onChange={(val) => val && setEditReminderFrequency(val as 'once' | 'daily' | 'weekly')}
            allowDeselect={false}
          />

          <Textarea
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            minRows={3}
            autosize
          />

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>Links</Text>
              <Button variant="subtle" size="xs" onClick={() => setEditLinks((prev) => [...prev, { label: '', url: '' }])}>
                + Add Link
              </Button>
            </Group>
            <Stack gap="xs">
              {editLinks.map((link, i) => (
                <Group key={i} gap="xs" wrap="nowrap">
                  <TextInput
                    placeholder="Label"
                    size="xs"
                    value={link.label}
                    onChange={(e) => setEditLinks((prev) => prev.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    placeholder="https://..."
                    size="xs"
                    value={link.url}
                    onChange={(e) => setEditLinks((prev) => prev.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))}
                    style={{ flex: 2 }}
                  />
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => setEditLinks((prev) => prev.filter((_, j) => j !== i))}>
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </div>

          <DocumentUpload
            documents={editDocuments}
            onChange={setEditDocuments}
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
  );
}
