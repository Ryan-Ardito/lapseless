import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Paper, Title, TextInput, Select, Checkbox, Textarea, Button, Group,
  NumberInput, Stack, SimpleGrid, Text,
} from '@mantine/core';
import type { Category, Channel, Obligation } from '../../types/obligation';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'license', label: 'License' },
  { value: 'ceu', label: 'CEU' },
  { value: 'tax', label: 'Tax' },
  { value: 'certification', label: 'Certification' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];
const CHANNELS: Channel[] = ['sms', 'email', 'whatsapp'];

interface ObligationFormProps {
  onAdd: (obligation: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => void;
  onAdded: () => void;
}

export function ObligationForm({ onAdd, onAdded }: ObligationFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('license');
  const [dueDate, setDueDate] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['email']);
  const [reminderDays, setReminderDays] = useState<number>(14);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleChannel(ch: Channel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!dueDate) errs.dueDate = 'Due date is required';
    if (channels.length === 0) errs.channels = 'Select at least one channel';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onAdd({
      name: name.trim(),
      category,
      dueDate,
      notes: notes.trim(),
      notification: { channels, reminderDaysBefore: reminderDays },
    });

    toast.success(`"${name.trim()}" added!`);
    setName('');
    setDueDate('');
    setNotes('');
    setChannels(['email']);
    setReminderDays(14);
    setErrors({});
    onAdded();
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      shadow="md"
      radius="lg"
      p="xl"
      withBorder
      maw={600}
    >
      <Title order={3} mb="lg" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        Add New Obligation
      </Title>

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
          <div>
            <Text size="sm" fw={500} mb={4}>Notification Channels</Text>
            <Group gap="lg">
              {CHANNELS.map((ch) => (
                <Checkbox
                  key={ch}
                  label={ch.charAt(0).toUpperCase() + ch.slice(1)}
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                />
              ))}
            </Group>
            {errors.channels && <Text size="xs" c="red" mt={4}>{errors.channels}</Text>}
          </div>
          <NumberInput
            label="Remind me (days before)"
            min={1}
            max={365}
            value={reminderDays}
            onChange={(val) => setReminderDays(Number(val))}
          />
        </SimpleGrid>

        <Textarea
          label="Notes"
          placeholder="Optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={3}
          autosize
        />

        <Button type="submit" size="md" mt="xs">
          Add Obligation
        </Button>
      </Stack>
    </Paper>
  );
}
