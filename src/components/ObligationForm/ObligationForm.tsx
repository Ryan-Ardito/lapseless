import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Modal, TextInput, Select, Checkbox, Textarea, Button, Group,
  NumberInput, Stack, SimpleGrid, Text, Accordion, ActionIcon,
} from '@mantine/core';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Category, Channel, Obligation } from '../../types/obligation';
import { CATEGORIES } from '../../constants/categories';
import { DocumentUpload } from '../DocumentUpload/DocumentUpload';
import type { DocumentMeta } from '../../types/obligation';

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'browser', label: 'Browser' },
];

const RECURRENCE_CATEGORIES: Category[] = ['tax', 'credit-card', 'mailbox', 'insurance', 'license'];
const REFERENCE_CATEGORIES: Category[] = ['license', 'insurance', 'certification'];

interface ObligationFormProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (obligation: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => void;
}

export function ObligationForm({ opened, onClose, onAdd }: ObligationFormProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('license');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['email']);
  const [reminderDays, setReminderDays] = useState<number>(14);
  const [reminderFrequency, setReminderFrequency] = useState<'once' | 'daily' | 'weekly'>('once');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [autoRenew, setAutoRenew] = useState(false);
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [ceuRequired, setCeuRequired] = useState<number>(0);
  const [ceuCompleted, setCeuCompleted] = useState<number>(0);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleChannel(ch: Channel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function addLink() {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function updateLink(index: number, field: 'label' | 'url', value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!dueDate) errs.dueDate = 'Due date is required';
    if (channels.length === 0) errs.channels = 'Select at least one channel';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function resetForm() {
    setName('');
    setCategory('license');
    setDueDate('');
    setStartDate('');
    setReferenceNumber('');
    setChannels(['email']);
    setReminderDays(14);
    setReminderFrequency('once');
    setNotes('');
    setLinks([]);
    setHasRecurrence(false);
    setRecurrenceType('yearly');
    setAutoRenew(false);
    setCeuRequired(0);
    setCeuCompleted(0);
    setDocuments([]);
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const filteredLinks = links.filter((l) => l.label.trim() && l.url.trim());

    onAdd({
      name: name.trim(),
      category,
      dueDate,
      startDate: startDate || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      links: filteredLinks.length > 0 ? filteredLinks : undefined,
      recurrence: hasRecurrence ? { type: recurrenceType, autoRenew } : undefined,
      ceuTracking: category === 'ceu' && ceuRequired > 0
        ? { required: ceuRequired, completed: ceuCompleted }
        : undefined,
      documents: documents.length > 0 ? documents : undefined,
      notes: notes.trim(),
      notification: { channels, reminderDaysBefore: reminderDays, reminderFrequency },
    });

    toast.success(`"${name.trim()}" added!`);
    resetForm();
    onClose();
  }

  const showReference = REFERENCE_CATEGORIES.includes(category);
  const showRecurrence = RECURRENCE_CATEGORIES.includes(category);
  const showCEU = category === 'ceu';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add New Obligation"
      size="lg"
      centered
      fullScreen={isMobile}
    >
      <form onSubmit={handleSubmit}>
        <Accordion defaultValue="basic" variant="separated">
          <Accordion.Item value="basic">
            <Accordion.Control>Basic Info</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="e.g., Nursing License Renewal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Category"
                    data={CATEGORIES}
                    value={category}
                    onChange={(val) => val && setCategory(val as Category)}
                    allowDeselect={false}
                  />
                  <TextInput
                    label="Due Date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    error={errors.dueDate}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Optional"
                  />
                  {showReference && (
                    <TextInput
                      label="Reference Number"
                      placeholder="e.g., License #, Policy #"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  )}
                </SimpleGrid>

                {showRecurrence && (
                  <Stack gap="xs">
                    <Checkbox
                      label="Recurring obligation"
                      checked={hasRecurrence}
                      onChange={(e) => setHasRecurrence(e.currentTarget.checked)}
                    />
                    {hasRecurrence && (
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Select
                          label="Frequency"
                          data={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'quarterly', label: 'Quarterly' },
                            { value: 'yearly', label: 'Yearly' },
                          ]}
                          value={recurrenceType}
                          onChange={(val) => val && setRecurrenceType(val as 'monthly' | 'quarterly' | 'yearly')}
                          allowDeselect={false}
                        />
                        <Checkbox
                          label="Auto-renew when completed"
                          checked={autoRenew}
                          onChange={(e) => setAutoRenew(e.currentTarget.checked)}
                          mt="xl"
                        />
                      </SimpleGrid>
                    )}
                  </Stack>
                )}

                {showCEU && (
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <NumberInput
                      label="CEU Hours Required"
                      min={0}
                      value={ceuRequired}
                      onChange={(val) => setCeuRequired(Number(val))}
                    />
                    <NumberInput
                      label="CEU Hours Completed"
                      min={0}
                      max={ceuRequired}
                      value={ceuCompleted}
                      onChange={(val) => setCeuCompleted(Number(val))}
                    />
                  </SimpleGrid>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="reminders">
            <Accordion.Control>Reminders</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <div>
                  <Text size="sm" fw={500} mb={4}>Notification Channels</Text>
                  <Group gap="lg">
                    {CHANNELS.map((ch) => (
                      <Checkbox
                        key={ch.value}
                        label={ch.label}
                        checked={channels.includes(ch.value)}
                        onChange={() => toggleChannel(ch.value)}
                      />
                    ))}
                  </Group>
                  {errors.channels && <Text size="xs" c="red" mt={4}>{errors.channels}</Text>}
                </div>

                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput
                    label="Remind me (days before)"
                    min={1}
                    max={365}
                    value={reminderDays}
                    onChange={(val) => setReminderDays(Number(val))}
                  />
                  <Select
                    label="Reminder Frequency"
                    data={[
                      { value: 'once', label: 'Once' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                    ]}
                    value={reminderFrequency}
                    onChange={(val) => val && setReminderFrequency(val as 'once' | 'daily' | 'weekly')}
                    allowDeselect={false}
                  />
                </SimpleGrid>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="details">
            <Accordion.Control>Details</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Textarea
                  label="Notes"
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  minRows={3}
                  autosize
                />

                <div>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>Links</Text>
                    <Button variant="subtle" size="xs" onClick={addLink}>+ Add Link</Button>
                  </Group>
                  <Stack gap="xs">
                    {links.map((link, i) => (
                      <Group key={i} gap="xs" wrap="nowrap">
                        <TextInput
                          placeholder="Label"
                          size="xs"
                          value={link.label}
                          onChange={(e) => updateLink(i, 'label', e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <TextInput
                          placeholder="https://..."
                          size="xs"
                          value={link.url}
                          onChange={(e) => updateLink(i, 'url', e.target.value)}
                          style={{ flex: 2 }}
                        />
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeLink(i)}>
                          <Text size="xs">✕</Text>
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                </div>

                <DocumentUpload documents={documents} onChange={setDocuments} />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Button type="submit" size="md" mt="md" fullWidth>
          Add Obligation
        </Button>
      </form>
    </Modal>
  );
}
