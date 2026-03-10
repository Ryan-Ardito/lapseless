export type ChecklistType = 'end-of-month' | 'end-of-year' | 'custom';

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  notes?: string;
}

export interface Checklist {
  id: string;
  type: ChecklistType;
  title: string;
  period: string;
  items: ChecklistItem[];
  createdAt: string;
}
