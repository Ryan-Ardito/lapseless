import { useState } from 'react';
import {
  Stack, Paper, Text, Group, Button, TextInput, ActionIcon,
  Modal, Badge,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { useChecklistTemplates } from '../../hooks/useChecklistTemplates';
import { useOrgContext } from '../../contexts/OrgContext';
import type { ChecklistTemplate } from '../../types/checklist';

export function ChecklistTemplates({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useChecklistTemplates();
  const { canManageMembers } = useOrgContext();

  const [editTemplate, setEditTemplate] = useState<ChecklistTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editItems, setEditItems] = useState<string[]>([]);
  const [editIsOrg, setEditIsOrg] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [isNew, setIsNew] = useState(false);

  const orgTemplates = templates.filter((t) => t.isOrg);
  const personalTemplates = templates.filter((t) => !t.isOrg);

  function openNew(isOrg: boolean) {
    setEditTemplate(null);
    setEditName('');
    setEditItems([]);
    setEditIsOrg(isOrg);
    setNewItemLabel('');
    setIsNew(true);
  }

  function openEdit(tpl: ChecklistTemplate) {
    setEditTemplate(tpl);
    setEditName(tpl.name);
    setEditItems([...tpl.items]);
    setEditIsOrg(tpl.isOrg);
    setNewItemLabel('');
    setIsNew(false);
  }

  function closeEdit() {
    setEditTemplate(null);
    setIsNew(false);
  }

  function handleAddItem() {
    if (!newItemLabel.trim()) return;
    setEditItems([...editItems, newItemLabel.trim()]);
    setNewItemLabel('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || editItems.length === 0) return;
    if (isNew) {
      await createTemplate({ name: editName.trim(), items: editItems, isOrg: editIsOrg });
    } else if (editTemplate) {
      await updateTemplate(editTemplate.id, { name: editName.trim(), items: editItems });
    }
    closeEdit();
  }

  function renderTemplateCard(tpl: ChecklistTemplate, canEdit: boolean) {
    return (
      <Paper key={tpl.id} p="sm" radius="md" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <div style={{ minWidth: 0 }}>
            <Group gap="xs">
              <Text fw={500} size="sm">{tpl.name}</Text>
              <Badge variant="light" size="xs" color={tpl.isOrg ? 'blue' : 'gray'}>
                {tpl.isOrg ? 'Org' : 'Personal'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">{tpl.items.length} item{tpl.items.length !== 1 ? 's' : ''}</Text>
          </div>
          {canEdit && (
            <Group gap={4}>
              <ActionIcon variant="subtle" size="sm" onClick={() => openEdit(tpl)}>
                <IconPencil size={14} />
              </ActionIcon>
              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteTemplate(tpl.id)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          )}
        </Group>
      </Paper>
    );
  }

  const editOpen = isNew || editTemplate !== null;

  return (
    <>
      <Modal opened={opened} onClose={onClose} title="Manage Templates" centered size="lg">
        <Stack gap="md">
          {canManageMembers && (
            <>
              <Group justify="space-between">
                <Text fw={600} size="sm">Organization Templates</Text>
                <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => openNew(true)}>
                  New
                </Button>
              </Group>
              {orgTemplates.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xs">No org templates yet</Text>
              ) : (
                <Stack gap="xs">{orgTemplates.map((t) => renderTemplateCard(t, true))}</Stack>
              )}
            </>
          )}

          <Group justify="space-between">
            <Text fw={600} size="sm">My Templates</Text>
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => openNew(false)}>
              New
            </Button>
          </Group>
          {personalTemplates.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xs">No personal templates yet</Text>
          ) : (
            <Stack gap="xs">{personalTemplates.map((t) => renderTemplateCard(t, true))}</Stack>
          )}

          {!canManageMembers && orgTemplates.length > 0 && (
            <>
              <Text fw={600} size="sm">Organization Templates</Text>
              <Stack gap="xs">{orgTemplates.map((t) => renderTemplateCard(t, false))}</Stack>
            </>
          )}
        </Stack>
      </Modal>

      <Modal opened={editOpen} onClose={closeEdit} title={isNew ? 'New Template' : 'Edit Template'} centered>
        <form onSubmit={handleSave}>
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="My Template"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <div>
              <Text size="sm" fw={500} mb={4}>Items</Text>
              <Stack gap={4}>
                {editItems.map((item, idx) => (
                  <Group key={idx} gap="xs" wrap="nowrap">
                    <Text size="sm" style={{ flex: 1 }}>{item}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
              <Group gap="xs" mt="xs">
                <TextInput
                  placeholder="Add item..."
                  size="xs"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                  style={{ flex: 1 }}
                />
                <Button size="xs" variant="light" onClick={handleAddItem}>Add</Button>
              </Group>
            </div>

            <Button type="submit" disabled={!editName.trim() || editItems.length === 0}>
              {isNew ? 'Create Template' : 'Save Changes'}
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
