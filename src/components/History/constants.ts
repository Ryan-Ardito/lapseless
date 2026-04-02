import {
  IconPlus, IconPencil, IconTrash, IconCheck, IconArrowBack,
} from '@tabler/icons-react';
import type { HistoryAction, EntityType } from '../../types/history';

export const ACTION_CONFIG: Record<HistoryAction, { icon: typeof IconPlus; color: string; label: string }> = {
  create: { icon: IconPlus, color: 'teal', label: 'Created' },
  update: { icon: IconPencil, color: 'blue', label: 'Updated' },
  delete: { icon: IconTrash, color: 'red', label: 'Deleted' },
  complete: { icon: IconCheck, color: 'green', label: 'Completed' },
  uncomplete: { icon: IconArrowBack, color: 'gray', label: 'Uncompleted' },
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  obligation: 'Obligation',
  checklist: 'Checklist',
  'pto-entry': 'PTO',
  document: 'Document',
};

export const ENTITY_COLORS: Record<EntityType, string> = {
  obligation: 'sage',
  checklist: 'grape',
  'pto-entry': 'teal',
  document: 'orange',
};
