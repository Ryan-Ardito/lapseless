import { useState } from 'react';
import {
  Stack, Title, Paper, Text, Group, Button, Checkbox, Progress,
  Modal, TextInput, Select, ActionIcon, Collapse, Badge,
} from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconX, IconPlus, IconChecklist } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Checklist, ChecklistType } from '../../types/checklist';
import { getTemplates } from '../../utils/checklistTemplates';
import { formatDate } from '../../utils/dates';

interface ChecklistViewProps {
  checklists: Checklist[];
  onCreateFromTemplate: (type: ChecklistType, period: string, title?: string) => Checklist;
  onDeleteChecklist: (id: string) => void;
  onToggleItem: (checklistId: string, itemId: string) => void;
  onAddItem: (checklistId: string, label: string) => void;
  onRemoveItem: (checklistId: string, itemId: string) => void;
}

export function ChecklistView({
  checklists, onCreateFromTemplate, onDeleteChecklist,
  onToggleItem, onAddItem, onRemoveItem,
}: ChecklistViewProps) {
  const isMobile = useIsMobile();
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ChecklistType>('end-of-month');
  const [createPeriod, setCreatePeriod] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

  const templates = getTemplates();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createPeriod.trim()) return;
    onCreateFromTemplate(createType, createPeriod.trim(), createTitle.trim() || undefined);
    toast.success('Checklist created');
    setCreateOpen(false);
    setCreatePeriod('');
    setCreateTitle('');
  }

  function handleAddItem(checklistId: string) {
    if (!newItemLabel.trim()) return;
    onAddItem(checklistId, newItemLabel.trim());
    setNewItemLabel('');
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Checklists</Title>
        <Button variant="light" size="sm" onClick={() => setCreateOpen(true)} leftSection={<IconPlus size={16} />}>New Checklist</Button>
      </Group>

      {checklists.length === 0 ? (
        <Paper p={40} ta="center" withBorder radius="lg">
          <Stack align="center" gap="sm">
            <IconChecklist size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={4}>No checklists yet</Title>
            <Text c="dimmed">Create a checklist from a template or start from scratch.</Text>
            <Button size="sm" onClick={() => setCreateOpen(true)}>Create Checklist</Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {checklists.map((cl) => {
            const completed = cl.items.filter((i) => i.completed).length;
            const total = cl.items.length;
            const pct = total > 0 ? (completed / total) * 100 : 0;
            const isExpanded = expandedId === cl.id;

            return (
              <Paper key={cl.id} p="md" radius="md" withBorder>
                <Group
                  justify="space-between"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : cl.id)}
                  wrap="nowrap"
                >
                  <div style={{ minWidth: 0 }}>
                    <Group gap="sm">
                      <Text fw={600} size="md">{cl.title}</Text>
                      <Badge variant="light" size="sm" color={pct === 100 ? 'teal' : 'gray'}>
                        {completed}/{total}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">{cl.period} — Created {formatDate(cl.createdAt)}</Text>
                  </div>
                  {isExpanded ? <IconChevronUp size={16} stroke={1.5} /> : <IconChevronDown size={16} stroke={1.5} />}
                </Group>

                <Progress value={pct} size="sm" mt="sm" color={pct === 100 ? 'teal' : 'indigo'} />

                <Collapse in={isExpanded}>
                  <Stack gap="xs" mt="md">
                    {cl.items.map((item) => (
                      <Group key={item.id} justify="space-between" wrap="nowrap">
                        <Checkbox
                          label={item.label}
                          checked={item.completed}
                          onChange={() => onToggleItem(cl.id, item.id)}
                          styles={{ label: { textDecoration: item.completed ? 'line-through' : undefined, color: item.completed ? 'var(--mantine-color-dimmed)' : undefined } }}
                        />
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemoveItem(cl.id, item.id)}>
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ))}

                    <Group gap="xs" mt="xs">
                      <TextInput
                        placeholder="Add item..."
                        size="xs"
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(cl.id); } }}
                        style={{ flex: 1 }}
                      />
                      <Button size="xs" variant="light" onClick={() => handleAddItem(cl.id)}>Add</Button>
                    </Group>

                    <Button variant="subtle" color="red" size="xs" mt="xs" onClick={() => { onDeleteChecklist(cl.id); toast.success('Checklist deleted'); }}>
                      Delete Checklist
                    </Button>
                  </Stack>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="New Checklist" centered fullScreen={isMobile}>
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <Select
              label="Template"
              data={[
                ...templates.map((t) => ({ value: t.type, label: t.title })),
                { value: 'custom', label: 'Blank (Custom)' },
              ]}
              value={createType}
              onChange={(val) => val && setCreateType(val as ChecklistType)}
              allowDeselect={false}
            />
            {createType === 'custom' && (
              <TextInput
                label="Title"
                placeholder="My Checklist"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            )}
            <TextInput
              label="Period"
              placeholder="e.g., March 2026, Q1 2026"
              value={createPeriod}
              onChange={(e) => setCreatePeriod(e.target.value)}
              required
            />
            <Button type="submit">Create</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
