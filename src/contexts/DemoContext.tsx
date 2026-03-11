import { createContext, useContext } from 'react';
import type { Obligation, AppNotification, DocumentMeta } from '../types/obligation';
import type { PTOEntry, PTOConfig, PTOType } from '../types/pto';
import type { Checklist, ChecklistType } from '../types/checklist';

export interface DemoContextValue {
  // Obligations
  obligations: Obligation[];
  addObligation: (obligation: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => void;
  updateObligation: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => void;
  deleteObligation: (id: string) => void;
  toggleComplete: (id: string) => void;
  loadSeedData: (seed: Obligation[]) => void;

  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;

  // PTO
  ptoEntries: PTOEntry[];
  ptoConfig: PTOConfig;
  totalUsed: number;
  remaining: number;
  usedByType: Record<PTOType, number>;
  addEntry: (entry: Omit<PTOEntry, 'id' | 'createdAt'>) => void;
  updateEntry: (id: string, updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>) => void;
  deleteEntry: (id: string) => void;
  updateConfig: (updates: Partial<PTOConfig>) => void;
  loadPTOSeedData: (seed: PTOEntry[]) => void;

  // Checklists
  checklists: Checklist[];
  createFromTemplate: (type: ChecklistType, period: string, title?: string) => Checklist;
  deleteChecklist: (id: string) => void;
  toggleItem: (checklistId: string, itemId: string) => void;
  addItem: (checklistId: string, label: string) => void;
  removeItem: (checklistId: string, itemId: string) => void;
  loadChecklistSeedData: (seed: Checklist[]) => void;

  // Documents
  standaloneDocs: DocumentMeta[];
  addStandaloneDoc: (doc: DocumentMeta) => void;
  updateStandaloneDoc: (id: string, updates: Partial<Pick<DocumentMeta, 'displayName'>>) => void;
  removeStandaloneDoc: (id: string) => void;
  loadDocSeedData: (seed: DocumentMeta[]) => void;

  // Modal
  addModalOpen: boolean;
  setAddModalOpen: (open: boolean) => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoContext must be used within DemoContext.Provider');
  return ctx;
}
