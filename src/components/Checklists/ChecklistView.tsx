import { useState } from 'react';
import {
  Stack, Title, Paper, Text, Group, Button, Checkbox, Progress,
  Modal, TextInput, Select, ActionIcon, Collapse, Badge, Switch,
} from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconX, IconPlus, IconChecklist, IconTemplate } from '@tabler/icons-react';
import { notify } from '../../utils/notify';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useChecklists } from '../../hooks/useChecklists';
import { useChecklistTemplates } from '../../hooks/useChecklistTemplates';
import { useOrgContext } from '../../contexts/OrgContext';
import type { Checklist, ChecklistType } from '../../types/checklist';
import { getTemplates } from '../../utils/checklistTemplates';
import { formatDate } from '../../utils/dates';
import { ListSkeleton } from '../PageSkeleton';
import { ErrorDisplay } from '../ErrorDisplay';
import { useModalSearchParam } from '../../hooks/useModalSearchParam';
import { ChecklistTemplates } from './ChecklistTemplates';

export function ChecklistView() {
  const {
    checklists, isLoading, isError, error, refetch,
    createFromTemplate, createFromCustomTemplate, deleteChecklist,
    toggleItem, addItem, removeItem,
    completeChecklist, uncompleteChecklist,
  } = useChecklists();
  const { templates: customTemplates, saveFromChecklist } = useChecklistTemplates();
  const { canManageMembers } = useOrgContext();
  const isMobile = useIsMobile();
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<string>('end-of-month');
  const [createPeriod, setCreatePeriod] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const { value: expandedId, open: expandChecklist, close: collapseChecklist } = useModalSearchParam('checklistId');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [modalFullScreen, setModalFullScreen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Save as template modal state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateChecklistId, setSaveTemplateChecklistId] = useState<string | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateIsOrg, setSaveTemplateIsOrg] = useState(false);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;

  const active = checklists.filter((c) => !c.completedAt);
  const completed = checklists.filter((c) => !!c.completedAt);
  const systemTemplates = getTemplates();

  const orgCustomTemplates = customTemplates.filter((t) => t.isOrg);
  const personalCustomTemplates = customTemplates.filter((t) => !t.isOrg);
  const templateSelectData: { group: string; items: { value: string; label: string }[] }[] = [
    { group: 'System', items: systemTemplates.map((t) => ({ value: t.type, label: t.title })) },
    ...(orgCustomTemplates.length > 0
      ? [{ group: 'Organization', items: orgCustomTemplates.map((t) => ({ value: `tpl:${t.id}`, label: t.name })) }]
      : []),
    ...(personalCustomTemplates.length > 0
      ? [{ group: 'My Templates', items: personalCustomTemplates.map((t) => ({ value: `tpl:${t.id}`, label: t.name })) }]
      : []),
    { group: 'Other', items: [{ value: 'custom', label: 'Blank (Custom)' }] },
  ];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createPeriod.trim()) return;

    if (createType.startsWith('tpl:')) {
      const templateId = createType.slice(4);
      const tpl = customTemplates.find((t) => t.id === templateId);
      if (tpl) {
        createFromCustomTemplate(tpl.items, createPeriod.trim(), createTitle.trim() || tpl.name);
      }
    } else {
      createFromTemplate(createType as ChecklistType, createPeriod.trim(), createTitle.trim() || undefined);
    }
    setCreateOpen(false);
    setCreatePeriod('');
    setCreateTitle('');
  }

  function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!saveTemplateChecklistId || !saveTemplateName.trim()) return;
    const cl = checklists.find((c) => c.id === saveTemplateChecklistId);
    if (!cl) return;
    saveFromChecklist({
      checklistId: saveTemplateChecklistId,
      name: saveTemplateName.trim(),
      items: cl.items.map((i) => i.label),
      isOrg: saveTemplateIsOrg,
    });
    setSaveTemplateOpen(false);
    setSaveTemplateChecklistId(null);
    setSaveTemplateName('');
    setSaveTemplateIsOrg(false);
  }

  function handleAddItem(checklistId: string) {
    if (!newItemLabel.trim()) return;
    addItem(checklistId, newItemLabel.trim());
    setNewItemLabel('');
  }

  function renderCard(cl: Checklist, isCompleted: boolean) {
    const completedItems = cl.items.filter((i) => i.completed).length;
    const total = cl.items.length;
    const pct = total > 0 ? (completedItems / total) * 100 : 0;
    const isExpanded = expandedId === cl.id;

    return (
      <Paper
        key={cl.id}
        p="md"
        radius="md"
        withBorder
        style={isCompleted ? { opacity: 0.6 } : undefined}
      >
        <Group
          justify="space-between"
          style={{ cursor: 'pointer' }}
          onClick={() => isExpanded ? collapseChecklist() : expandChecklist(cl.id)}
          wrap="nowrap"
        >
          <div style={{ minWidth: 0 }}>
            <Group gap="sm">
              <Text fw={600} size="md">{cl.title}</Text>
              <Badge variant="light" size="sm" color={pct === 100 ? 'teal' : 'gray'}>
                {completedItems}/{total}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">{cl.period} — Created {formatDate(cl.createdAt)}</Text>
          </div>
          {isExpanded ? <IconChevronUp size={16} stroke={1.5} /> : <IconChevronDown size={16} stroke={1.5} />}
        </Group>

        <Progress value={pct} size="sm" mt="sm" color={pct === 100 ? 'teal' : 'sage'} />

        <Collapse in={isExpanded}>
          <Stack gap="xs" mt="md">
            {cl.items.map((item) => (
              <Group key={item.id} justify="space-between" wrap="nowrap">
                <Checkbox
                  label={item.label}
                  checked={item.completed}
                  onChange={isCompleted ? undefined : () => toggleItem(cl.id, item.id)}
                  disabled={isCompleted}
                  styles={{ label: { textDecoration: item.completed ? 'line-through' : undefined, color: item.completed ? 'var(--mantine-color-dimmed)' : undefined } }}
                />
                {!isCompleted && (
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItem(cl.id, item.id)}>
                    <IconX size={14} />
                  </ActionIcon>
                )}
              </Group>
            ))}

            {!isCompleted && (
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
            )}

            <Group gap="xs" mt="xs">
              {isCompleted ? (
                <Button variant="subtle" size="xs" onClick={async () => { await uncompleteChecklist(cl.id); notify.success('Checklist reopened'); }}>
                  Reopen
                </Button>
              ) : (
                <Button variant="light" color="teal" size="xs" onClick={async () => { await completeChecklist(cl.id); notify.success('Checklist completed'); }}>
                  Complete
                </Button>
              )}
              {cl.items.length > 0 && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconTemplate size={14} />}
                  onClick={() => {
                    setSaveTemplateChecklistId(cl.id);
                    setSaveTemplateName(cl.title);
                    setSaveTemplateOpen(true);
                  }}
                >
                  Save as Template
                </Button>
              )}
              <Button variant="subtle" color="red" size="xs" onClick={() => deleteChecklist(cl.id)}>
                Delete Checklist
              </Button>
            </Group>
          </Stack>
        </Collapse>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="flex-end">
        <Button variant="subtle" size="sm" onClick={() => setTemplatesOpen(true)} leftSection={<IconTemplate size={16} />}>Manage Templates</Button>
        <Button variant="light" size="sm" onClick={() => { setModalFullScreen(!!isMobile); setCreateOpen(true); }} leftSection={<IconPlus size={16} />}>New Checklist</Button>
      </Group>

      {active.length === 0 && completed.length === 0 ? (
        <Paper p={40} ta="center" withBorder radius="lg">
          <Stack align="center" gap="sm">
            <IconChecklist size={48} stroke={1.5} color="var(--mantine-color-dimmed)" />
            <Title order={4}>No checklists yet</Title>
            <Text c="dimmed">Create a checklist from a template or start from scratch.</Text>
            <Button size="sm" onClick={() => { setModalFullScreen(!!isMobile); setCreateOpen(true); }}>Create Checklist</Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="md">
          {active.map((cl) => renderCard(cl, false))}

          {completed.length > 0 && (
            <>
              <Title order={4} c="dimmed" mt="md">Completed</Title>
              {completed.map((cl) => renderCard(cl, true))}
            </>
          )}
        </Stack>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="New Checklist" centered fullScreen={modalFullScreen}>
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <Select
              label="Template"
              data={templateSelectData}
              value={createType}
              onChange={(val) => val && setCreateType(val)}
              allowDeselect={false}
            />
            {(createType === 'custom' || createType.startsWith('tpl:')) && (
              <TextInput
                label="Title"
                placeholder={createType.startsWith('tpl:')
                  ? customTemplates.find((t) => t.id === createType.slice(4))?.name ?? 'My Checklist'
                  : 'My Checklist'}
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

      <Modal opened={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title="Save as Template" centered>
        <form onSubmit={handleSaveAsTemplate}>
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="My Template"
              value={saveTemplateName}
              onChange={(e) => setSaveTemplateName(e.target.value)}
              required
            />
            {canManageMembers && (
              <Switch
                label="Share with organization"
                description="All org members will be able to use this template"
                checked={saveTemplateIsOrg}
                onChange={(e) => setSaveTemplateIsOrg(e.currentTarget.checked)}
              />
            )}
            <Button type="submit">Save Template</Button>
          </Stack>
        </form>
      </Modal>

      <ChecklistTemplates opened={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </Stack>
  );
}
