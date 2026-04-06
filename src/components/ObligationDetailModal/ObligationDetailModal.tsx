import { useState, useEffect } from 'react';
import {
  Text, Group, Button, SimpleGrid, Stack, Badge, Alert, Paper, FileInput,
  Modal, Drawer, TextInput, Select, Checkbox, Textarea, NumberInput, Progress, Anchor, ActionIcon,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { TIME_OPTIONS } from '../../constants/time';
import { IconX, IconBell, IconBellOff, IconPlus, IconMinus, IconAlertTriangle, IconEye, IconDownload, IconLink } from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Obligation, Category, Channel, DocumentMeta } from '../../types/obligation';
import { getObligationStatus, formatDate, formatRelative } from '../../utils/dates';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { saveDocument, getDocument } from '../../utils/documents';
import { useDocuments } from '../../hooks/useDocuments';
import { CATEGORIES } from '../../constants/categories';
import { CHANNELS } from '../../constants/theme';
import { get2faStatus, getSmsCredits, type TwoFactorStatus, type SmsCredits } from '../../api/http/two-factor';
import { useOrgContext } from '../../contexts/OrgContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { SmsWarning } from '../SmsWarning/SmsWarning';
import { generateReminderDates } from '../../utils/reminderDates';
import { useSettings } from '../../hooks/useSettings';

const RECURRENCE_CATEGORIES: Category[] = ['tax', 'credit-card', 'mailbox', 'insurance', 'license'];
const REFERENCE_CATEGORIES: Category[] = ['license', 'insurance', 'certification'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const { orgId } = useOrgContext();
  const { viewAsUserId } = useViewAs();
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const { documents: allDocs, updateDocument: patchDocument } = useDocuments();
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [modalFullScreen, setModalFullScreen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('license');
  const [editDueDate, setEditDueDate] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editChannels, setEditChannels] = useState<Channel[]>([]);
  const [editReminderDays, setEditReminderDays] = useState<number | string>(14);
  const [editDocuments, setEditDocuments] = useState<DocumentMeta[]>([]);
  const [editStartDate, setEditStartDate] = useState<string | null>(null);
  const [editReferenceNumber, setEditReferenceNumber] = useState('');
  const [editLinks, setEditLinks] = useState<{ label: string; url: string }[]>([]);
  const [editHasRecurrence, setEditHasRecurrence] = useState(false);
  const [editRecurrenceType, setEditRecurrenceType] = useState<'monthly' | 'quarterly' | 'yearly' | 'biennial'>('yearly');
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [editCeuRequired, setEditCeuRequired] = useState<number | string>(0);
  const [editCeuCompleted, setEditCeuCompleted] = useState<number | string>(0);
  const [editReminderFrequency, setEditReminderFrequency] = useState<'once' | 'daily' | 'weekly' | 'custom'>('once');
  const [editReminderDates, setEditReminderDates] = useState<string[]>([]);
  const [editReminderTime, setEditReminderTime] = useState<string>('');
  const [tfaStatus, setTfaStatus] = useState<TwoFactorStatus | null>(null);
  const [smsCredits, setSmsCredits] = useState<SmsCredits | null>(null);

  useEffect(() => {
    if (obligation) {
      get2faStatus().then(setTfaStatus).catch(() => {});
      getSmsCredits(orgId).then(setSmsCredits).catch(() => {});
    }
  }, [obligation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate reminder dates when edit inputs change (non-custom mode)
  useEffect(() => {
    if (!editing || !editDueDate || editReminderFrequency === 'custom') return;
    const generated = generateReminderDates(editDueDate, Number(editReminderDays) || 14, editReminderFrequency);
    setEditReminderDates(generated);
  }, [editing, editDueDate, editReminderDays, editReminderFrequency]);

  // Reset edit state when a different obligation is opened
  const displayed = obligation;
  if (obligation && obligation.id !== lastOpenedId) {
    setLastOpenedId(obligation.id);
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
    setEditStartDate(displayed.startDate ?? null);
    setEditReferenceNumber(displayed.referenceNumber ?? '');
    setEditLinks(displayed.links ? displayed.links.map((l) => ({ ...l })) : []);
    setEditHasRecurrence(!!displayed.recurrence);
    setEditRecurrenceType(displayed.recurrence?.type ?? 'yearly');
    setEditAutoRenew(displayed.recurrence?.autoRenew ?? false);
    setEditCeuRequired(displayed.ceuTracking?.required ?? 0);
    setEditCeuCompleted(displayed.ceuTracking?.completed ?? 0);
    setEditReminderFrequency(displayed.notification.reminderFrequency ?? 'once');
    setEditReminderDates(displayed.notification.reminderDates ?? []);
    setEditReminderTime(displayed.notification.reminderTime ?? settings.defaultReminder.time ?? '09:00');
    setEditing(true);
  }

  async function saveEdit() {
    if (!displayed) return;
    if (!editName.trim()) return;
    if (!editDueDate) return;
    if (editChannels.length === 0) return;

    const filteredLinks = editLinks.filter((l) => l.label.trim() && l.url.trim());
    const updates: Partial<Omit<Obligation, 'id' | 'createdAt'>> = {
      name: editName.trim(),
      category: editCategory,
      dueDate: editDueDate!,
      startDate: editStartDate || undefined,
      referenceNumber: editReferenceNumber.trim() || undefined,
      links: filteredLinks.length > 0 ? filteredLinks : undefined,
      recurrence: editHasRecurrence ? { type: editRecurrenceType, autoRenew: editAutoRenew } : undefined,
      ceuTracking: editCategory === 'ceu' && Number(editCeuRequired) > 0
        ? { required: Number(editCeuRequired), completed: Number(editCeuCompleted) || 0 }
        : undefined,
      notes: editNotes.trim(),
      notification: {
        channels: editChannels,
        reminderDaysBefore: Number(editReminderDays) || 14,
        reminderFrequency: editReminderFrequency,
        reminderDates: editReminderDates,
        reminderTime: editReminderTime || undefined,
        muted: displayed.notification.muted,
      },
    };

    await updateObligation(displayed.id, updates);

    notify.success(`"${editName.trim()}" updated!`);
    setEditing(false);
  }

  function toggleEditChannel(ch: Channel) {
    setEditChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  async function handleViewDoc(doc: DocumentMeta) {
    const blob = await getDocument(orgId, doc.id);
    if (!blob) { notify.error('Document not found'); return; }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async function handleDownloadDoc(doc: DocumentMeta) {
    const blob = await getDocument(orgId, doc.id);
    if (!blob) { notify.error('Document not found'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUploadNewDocument(file: File | null) {
    if (!file || !displayed) return;
    setUploading(true);
    try {
      const meta = await saveDocument(orgId, file, displayed.id, viewAsUserId);
      setEditDocuments((prev) => [...prev, meta]);
      notify.success(`"${file.name}" uploaded`);
    } catch {
      notify.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function handleLinkExistingDocument(docId: string | null) {
    if (!docId || !displayed) return;
    try {
      await patchDocument(docId, { obligationId: displayed.id });
      const doc = allDocs.find((d) => d.id === docId);
      if (doc) setEditDocuments((prev) => [...prev, { ...doc, obligationId: displayed.id }]);
      notify.success('Document linked');
    } catch {
      notify.error('Failed to link document');
    }
  }

  async function handleUnlinkDocument(docId: string) {
    try {
      await patchDocument(docId, { obligationId: undefined });
      setEditDocuments((prev) => prev.filter((d) => d.id !== docId));
      notify.success('Document unlinked');
    } catch {
      notify.error('Failed to unlink document');
    }
  }

  function handleClose() {
    setEditing(false);
    onClose();
  }

  const unlinkedDocs = allDocs.filter((d) => !d.obligationId && !editDocuments.some((ed) => ed.id === d.id));

  return (
    <>
    <Drawer
      opened={obligation !== null && !editing}
      onClose={handleClose}
      title={displayed?.name}
      position="right"
      size={isMobile ? '100%' : 'lg'}
      overlayProps={{ backgroundOpacity: 0.3 }}
    >
      {displayed && !editing && (() => {
        const isDeleted = !!displayed.deletedAt;
        const status = isDeleted ? 'completed' as const : getObligationStatus(displayed.dueDate, displayed.completed);
        return (
          <Stack gap="md">
            {isDeleted && (
              <Text c="red" size="sm" fw={500}>This obligation has been deleted.</Text>
            )}
            <Group>
              {!isDeleted && <StatusBadge status={status} />}
              <Badge variant="light" color="gray" size="sm" tt="capitalize">
                {displayed.category}
              </Badge>
              {displayed.recurrence && (
                <Badge variant="light" color="sage" size="sm">
                  {displayed.recurrence.type}{displayed.recurrence.autoRenew ? ' (auto-renew)' : ''}
                </Badge>
              )}
              {displayed.notification.muted && (
                <Badge variant="light" color="orange" size="sm" leftSection={<IconBellOff size={12} />}>
                  Notifications Muted
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
                {displayed.notification.reminderFrequency === 'custom' ? (
                  <Text size="sm">{(displayed.notification.reminderDates ?? []).length} custom date(s)</Text>
                ) : (
                  <>
                    <Text size="sm">{displayed.notification.reminderDaysBefore} days before</Text>
                    {displayed.notification.reminderFrequency && displayed.notification.reminderFrequency !== 'once' && (
                      <Text size="xs" c="dimmed">Repeats {displayed.notification.reminderFrequency}</Text>
                    )}
                  </>
                )}
                {displayed.notification.reminderTime && (
                  <Text size="xs" c="dimmed">At {displayed.notification.reminderTime}</Text>
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
                <Group justify="space-between" mt={4}>
                  <Text size="sm">
                    {displayed.ceuTracking.completed} of {displayed.ceuTracking.required} hours completed
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size="md"
                      disabled={displayed.ceuTracking.completed <= 0}
                      onClick={() => {
                        const newCompleted = Math.max(Math.round((displayed.ceuTracking!.completed - 0.5) * 100) / 100, 0);
                        updateObligation(displayed.id, {
                          ceuTracking: { ...displayed.ceuTracking!, completed: newCompleted },
                        });
                      }}
                    >
                      <IconMinus size={16} />
                    </ActionIcon>
                    <Text size="xs" c="dimmed">30 min</Text>
                    <ActionIcon
                      variant="light"
                      color="sage"
                      size="md"
                      disabled={displayed.ceuTracking.completed >= displayed.ceuTracking.required}
                      onClick={() => {
                        const newCompleted = Math.min(Math.round((displayed.ceuTracking!.completed + 0.5) * 100) / 100, displayed.ceuTracking!.required);
                        updateObligation(displayed.id, {
                          ceuTracking: { ...displayed.ceuTracking!, completed: newCompleted },
                        });
                      }}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
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
              <Group gap={6} style={displayed.notification.muted ? { opacity: 0.4 } : undefined}>
                {displayed.notification.channels.map((ch) => (
                  <Badge key={ch} variant="light" color="teal" size="sm" tt="uppercase">
                    {ch}
                  </Badge>
                ))}
              </Group>
              {displayed.notification.muted && (
                <Text size="xs" c="orange" mt={4}>Notifications are muted</Text>
              )}
              {tfaStatus && displayed.notification.channels.includes('sms') && !tfaStatus.phoneVerified && (
                <Alert variant="light" color="yellow" icon={<IconAlertTriangle size={14} />} mt={4} p="xs">
                  <Text size="xs">SMS requires a verified phone number. <Anchor href="/app/account#notifications" size="xs">Set up in Account Settings.</Anchor></Text>
                </Alert>
              )}
            </div>

            {(displayed.documents && displayed.documents.length > 0) && (
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                  Documents ({displayed.documents.length})
                </Text>
                <Stack gap={4}>
                  {displayed.documents.map((doc) => (
                    <Paper key={doc.id} p="xs" withBorder radius="sm">
                      <Group justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" truncate fw={500}>{doc.displayName || doc.name}</Text>
                          <Text size="xs" c="dimmed">{formatSize(doc.size)}</Text>
                        </div>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon variant="subtle" size="sm" onClick={() => handleViewDoc(doc)} title="View">
                            <IconEye size={14} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" size="sm" onClick={() => handleDownloadDoc(doc)} title="Download">
                            <IconDownload size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Created</Text>
              <Text size="sm">{formatDate(displayed.createdAt)}</Text>
            </div>

            {!isDeleted && (
            <Group gap="xs" mt="md">
              <Button size="sm" onClick={startEditing}>
                Edit
              </Button>
              <Button
                variant={displayed.completed ? 'default' : 'light'}
                color={displayed.completed ? 'gray' : 'teal'}
                size="sm"
                onClick={() => toggleComplete(displayed.id)}
              >
                {displayed.completed ? 'Undo' : 'Complete'}
              </Button>
              <Button
                variant="light"
                color={displayed.notification.muted ? 'orange' : 'gray'}
                size="sm"
                leftSection={displayed.notification.muted ? <IconBellOff size={16} /> : <IconBell size={16} />}
                onClick={async () => {
                  const newMuted = !displayed.notification.muted;
                  await updateObligation(displayed.id, { notification: { ...displayed.notification, muted: newMuted } });
                  notify.success(newMuted ? 'Notifications muted' : 'Notifications unmuted');
                }}
              >
                {displayed.notification.muted ? 'Unmute' : 'Mute'}
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
            )}
          </Stack>
        );
      })()}
    </Drawer>

    <Modal
      opened={obligation !== null && editing}
      onClose={() => setEditing(false)}
      title="Edit Obligation"
      size="lg"
      centered
      fullScreen={modalFullScreen}
    >
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
            <DatePickerInput
              type="default"
              label="Due Date"
              placeholder="Select date"
              value={editDueDate}
              onChange={setEditDueDate}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <DatePickerInput
              type="default"
              label="Start Date"
              placeholder="Optional"
              value={editStartDate}
              onChange={setEditStartDate}
              clearable
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
                      { value: 'biennial', label: 'Every 2 years' },
                    ]}
                    value={editRecurrenceType}
                    onChange={(val) => val && setEditRecurrenceType(val as 'monthly' | 'quarterly' | 'yearly' | 'biennial')}
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
                onChange={setEditCeuRequired}
              />
              <NumberInput
                label="CEU Hours Completed"
                min={0}
                max={Number(editCeuRequired) || undefined}
                value={editCeuCompleted}
                onChange={setEditCeuCompleted}
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
              {tfaStatus && (
                <SmsWarning
                  channels={editChannels}
                  phoneVerified={tfaStatus.phoneVerified}
                  smsCredits={smsCredits}
                  reminderFrequency={editReminderFrequency}
                />
              )}
            </div>
            <NumberInput
              label="Remind me (days before)"
              min={1}
              max={365}
              value={editReminderDays}
              onChange={setEditReminderDays}
              disabled={editReminderFrequency === 'custom'}
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
            onChange={(val) => val && setEditReminderFrequency(val as 'once' | 'daily' | 'weekly' | 'custom')}
            allowDeselect={false}
          />

          {/* ReminderCalendar disabled – needs Mantine DatePicker migration */}

          <Select
            label="Reminder time"
            data={TIME_OPTIONS}
            value={editReminderTime}
            onChange={(val) => val && setEditReminderTime(val)}
            searchable
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

          <div>
            <Text size="sm" fw={500} mb={4}>Documents</Text>
            {editDocuments.length > 0 && (
              <Stack gap={4} mb="sm">
                {editDocuments.map((doc) => (
                  <Paper key={doc.id} p="xs" withBorder radius="sm">
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" truncate fw={500}>{doc.displayName || doc.name}</Text>
                        <Text size="xs" c="dimmed">{formatSize(doc.size)}</Text>
                      </div>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon variant="subtle" size="sm" onClick={() => handleViewDoc(doc)} title="View">
                          <IconEye size={14} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" size="sm" onClick={() => handleDownloadDoc(doc)} title="Download">
                          <IconDownload size={14} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleUnlinkDocument(doc.id)} title="Unlink">
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
            <FileInput
              label="Upload New Document"
              placeholder="Choose file (PDF, JPG, PNG)"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUploadNewDocument}
              disabled={uploading}
              clearable
            />
            {unlinkedDocs.length > 0 && (
              <Select
                label="Link Existing Document"
                placeholder="Select a document"
                data={unlinkedDocs.map((d) => ({ value: d.id, label: d.displayName || d.name }))}
                value={null}
                onChange={handleLinkExistingDocument}
                searchable
                clearable
                leftSection={<IconLink size={14} />}
                mt="sm"
              />
            )}
          </div>

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
    </>
  );
}
