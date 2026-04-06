import type { Checklist } from '../../types/checklist';
import { apiFetch } from './client';

export function getChecklists(orgId: string, userId?: string): Promise<Checklist[]> {
  const qs = userId ? `?userId=${userId}` : '';
  return apiFetch(`/api/orgs/${orgId}/checklists${qs}`);
}

export function createChecklist(orgId: string, data: Checklist, targetUserId?: string): Promise<Checklist> {
  return apiFetch(`/api/orgs/${orgId}/checklists`, {
    method: 'POST',
    body: JSON.stringify(targetUserId ? { ...data, targetUserId } : data),
  });
}

export function updateChecklist(
  orgId: string,
  id: string,
  updates: Partial<Checklist>,
): Promise<Checklist> {
  return apiFetch(`/api/orgs/${orgId}/checklists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteChecklist(orgId: string, id: string): Promise<Checklist> {
  return apiFetch(`/api/orgs/${orgId}/checklists/${id}`, { method: 'DELETE' });
}

export function restoreChecklist(orgId: string, id: string): Promise<Checklist> {
  return apiFetch(`/api/orgs/${orgId}/checklists/${id}/restore`, { method: 'POST' });
}

export function seedChecklists(_orgId: string, _data: Checklist[]): Promise<Checklist[]> {
  return Promise.resolve([]);
}
