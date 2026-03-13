import type { Checklist } from '../../types/checklist';
import { apiFetch } from './client';

export function getChecklists(): Promise<Checklist[]> {
  return apiFetch('/api/checklists');
}

export function createChecklist(data: Checklist): Promise<Checklist> {
  return apiFetch('/api/checklists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateChecklist(
  id: string,
  updates: Partial<Checklist>,
): Promise<Checklist> {
  return apiFetch(`/api/checklists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteChecklist(id: string): Promise<Checklist> {
  return apiFetch(`/api/checklists/${id}`, { method: 'DELETE' });
}

export function restoreChecklist(id: string): Promise<Checklist> {
  return apiFetch(`/api/checklists/${id}/restore`, { method: 'POST' });
}

export function seedChecklists(_data: Checklist[]): Promise<Checklist[]> {
  return Promise.resolve([]);
}
