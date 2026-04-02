import type { ChecklistTemplate } from '../../types/checklist';
import { apiFetch } from './client';

export function getChecklistTemplates(orgId: string): Promise<ChecklistTemplate[]> {
  return apiFetch(`/api/orgs/${orgId}/checklist-templates`);
}

export function createChecklistTemplate(
  orgId: string,
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return apiFetch(`/api/orgs/${orgId}/checklist-templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateChecklistTemplate(
  orgId: string,
  id: string,
  updates: { name?: string; items?: string[] },
): Promise<ChecklistTemplate> {
  return apiFetch(`/api/orgs/${orgId}/checklist-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteChecklistTemplate(orgId: string, id: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/checklist-templates/${id}`, { method: 'DELETE' });
}

export function createTemplateFromChecklist(
  orgId: string,
  checklistId: string,
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return apiFetch(`/api/orgs/${orgId}/checklist-templates/from-checklist/${checklistId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
