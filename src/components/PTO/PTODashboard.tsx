import { useState } from 'react';
import {
  Stack, Title, SimpleGrid, Paper, Text, Progress, Badge, Group,
  Button, Modal, TextInput, NumberInput, Select, Textarea, ActionIcon, Collapse,
} from '@mantine/core';
import { IconPencil, IconX, IconPlus, IconBeach, IconChevronLeft, IconChevronRight, IconSettings } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import { usePTO } from '../../hooks/usePTO';
import type { PTOType, PTOEntry } from '../../types/pto';
import { formatDateRange } from '../../utils/dates';
import { PTO_TYPES } from '../../constants/theme';
import { ListSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';

export function PTODashboard() {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const {
    entries, config, totalUsed, remaining, usedByType,
    isLoading, isError, error, refetch,
    addEntry, updateEntry, deleteEntry, updateConfig,
  } = usePTO(selectedYear);
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formHours, setFormHours] = useState<number>(8);
  const [formType, setFormType] = useState<PTOType>('vacation');
  const [formNotes, setFormNotes] = useState('');
  const [modalFullScreen, setModalFullScreen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  const pctUsed = config.yearlyAllowance > 0
    ? Math.min((totalUsed / config.yearlyAllowance) * 100, 100)
    : 0;

  function openAdd() {
    setEditingId(null);
    setFormStartDate('');
    setFormEndDate('');
    setFormHours(8);
    setFormType('vacation');
    setFormNotes('');
    setModalFullScreen(!!isMobile);
    setModalOpen(true);
  }

  function openEdit(entry: PTOEntry) {
    setEditingId(entry.id);
    setFormStartDate(entry.startDate);
    setFormEndDate(entry.endDate);
    setFormHours(entry.hours);
    setFormType(entry.type);
    setFormNotes(entry.notes ?? '');
    setModalFullScreen(!!isMobile);
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formStartDate) return;
    const effectiveEnd = formEndDate || formStartDate;
    if (formStartDate > effectiveEnd) {
      toast.error('Start date must be on or before end date');
      return;
    }

    if (editingId) {
      updateEntry(editingId, { startDate: formStartDate, endDate: effectiveEnd, hours: formHours, type: formType, notes: formNotes || undefined });
      toast.success('PTO entry updated');
    } else {
      addEntry({ startDate: formStartDate, endDate: effectiveEnd, hours: formHours, type: formType, notes: formNotes || undefined });
      toast.success('PTO entry added');
    }
    setModalOpen(false);
  }

  const sortedEntries = [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => setSelectedYear((y) => y - 1)}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Title order={2}>PTO Tracker — {selectedYear}</Title>
          <ActionIcon variant="subtle" onClick={() => setSelectedYear((y) => y + 1)}>
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => setConfigOpen((o) => !o)}>
            <IconSettings size={18} />
          </ActionIcon>
          <Button variant="light" size="sm" onClick={openAdd} leftSection={<IconPlus size={16} />}>Add PTO</Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hours Used</Text>
          <Text size="1.75rem" fw={800} c="sage.6" lh={1} mt={4}>{totalUsed}</Text>
          <Text size="xs" c="dimmed" mt={2}>of {config.yearlyAllowance} hours</Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hours Remaining</Text>
          <Text size="1.75rem" fw={800} c={remaining < 0 ? 'red.6' : 'teal.6'} lh={1} mt={4}>{remaining}</Text>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Days Taken</Text>
          <Text size="1.75rem" fw={800} c="sage.6" lh={1} mt={4}>{(totalUsed / 8).toFixed(1)}</Text>
        </Paper>
      </SimpleGrid>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={500} mb="xs">Usage</Text>
        <Progress value={pctUsed} size="lg" color={pctUsed > 90 ? 'red' : pctUsed > 70 ? 'yellow' : 'sage'} />
        <Text size="xs" c="dimmed" mt={4}>{pctUsed.toFixed(0)}% used</Text>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={500} mb="xs">Breakdown by Type</Text>
        <Group gap="md">
          {PTO_TYPES.map(({ value, label, color }) => (
            usedByType[value] > 0 && (
              <Badge key={value} variant="light" color={color} size="lg">
                {label}: {usedByType[value]}h
              </Badge>
            )
          ))}
          {totalUsed === 0 && <Text size="sm" c="dimmed">No PTO taken yet</Text>}
        </Group>
      </Paper>

      <Collapse in={configOpen}>
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" fw={500} mb="xs">Configuration</Text>
          <NumberInput
            label="Yearly Allowance (hours)"
            min={0}
            max={2000}
            value={config.yearlyAllowance}
            onChange={(val) => updateConfig({ yearlyAllowance: Number(val), year: selectedYear })}
          />
        </Paper>
      </Collapse>

      {sortedEntries.length > 0 ? (
        <Stack gap="sm">
          <Text size="sm" fw={500}>Entries</Text>
          {sortedEntries.map((entry) => {
            const typeInfo = PTO_TYPES.find((t) => t.value === entry.type);
            return (
              <Paper key={entry.id} p="sm" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Badge variant="light" color={typeInfo?.color ?? 'gray'} size="sm">
                      {typeInfo?.label ?? entry.type}
                    </Badge>
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500}>{formatDateRange(entry.startDate, entry.endDate)} — {entry.hours}h</Text>
                      {entry.notes && <Text size="xs" c="dimmed" truncate>{entry.notes}</Text>}
                    </div>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(entry)}>
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => { deleteEntry(entry.id); toast.success('Entry deleted'); }}>
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      ) : (
        <Paper p={40} ta="center" withBorder radius="lg">
          <Stack align="center" gap="sm">
            <IconBeach size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed">No PTO entries yet. Click "Add PTO" to log time off.</Text>
          </Stack>
        </Paper>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit PTO Entry' : 'Add PTO Entry'} centered fullScreen={modalFullScreen}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput label="Date" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required />
            <TextInput label="End Date (optional, for multi-day)" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            <NumberInput label="Hours" min={0.5} max={240} step={0.5} value={formHours} onChange={(val) => setFormHours(Number(val))} required />
            <Select
              label="Type"
              data={PTO_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={formType}
              onChange={(val) => val && setFormType(val as PTOType)}
              allowDeselect={false}
            />
            <Textarea label="Notes" placeholder="Optional..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            <Button type="submit">{editingId ? 'Save' : 'Add Entry'}</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
