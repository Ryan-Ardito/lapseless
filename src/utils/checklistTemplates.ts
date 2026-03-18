import type { ChecklistItem, ChecklistType } from '../types/checklist';

interface Template {
  type: ChecklistType;
  title: string;
  items: string[];
}

const TEMPLATES: Template[] = [
  {
    type: 'end-of-month',
    title: 'End of Month',
    items: [
      'Confirm payouts',
      'Calculate taxes and transfer funds',
      'Credit card payment',
      'Check treatment plans',
      'Complete notes',
      'Track monthly expenses',
    ],
  },
  {
    type: 'end-of-year',
    title: 'End of Year / Tax',
    items: [
      'Gather W-2 and 1099 forms',
      'Compile deductible expenses',
      'Review retirement contributions',
      'Verify CEU requirements met',
      'Renew expiring licenses',
      'Review insurance policies',
      'Back up all documents',
    ],
  },
];

export function getTemplates(): Template[] {
  return TEMPLATES;
}

export function createItemsFromTemplate(type: ChecklistType): ChecklistItem[] {
  const template = TEMPLATES.find((t) => t.type === type);
  if (!template) return [];
  return template.items.map((label) => ({
    id: crypto.randomUUID(),
    label,
    completed: false,
  }));
}
