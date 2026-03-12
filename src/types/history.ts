export type EntityType = 'obligation' | 'checklist' | 'pto-entry' | 'document';

export type HistoryAction = 'create' | 'update' | 'delete' | 'complete' | 'uncomplete';

export interface HistoryEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  action: HistoryAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: string;
  undone?: boolean;
  renewedId?: string;
}
