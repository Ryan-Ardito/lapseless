import type { DocumentMeta } from '../../types/obligation';
import { apiFetch } from './client';

export function getDocuments(orgId: string, userId?: string): Promise<DocumentMeta[]> {
  const qs = userId ? `?userId=${userId}` : '';
  return apiFetch(`/api/orgs/${orgId}/documents${qs}`);
}

export function addDocument(_orgId: string, doc: DocumentMeta): Promise<DocumentMeta> {
  // In HTTP mode, documents are registered via the upload flow in utils/documents.http.ts
  return Promise.resolve(doc);
}

export function updateDocument(
  orgId: string,
  id: string,
  updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>>,
): Promise<DocumentMeta> {
  const body: Record<string, unknown> = {};
  if (updates.displayName !== undefined) body.displayName = updates.displayName;
  if ('obligationId' in updates) body.obligationId = updates.obligationId ?? null;
  return apiFetch(`/api/orgs/${orgId}/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function removeDocument(orgId: string, id: string): Promise<DocumentMeta> {
  return apiFetch(`/api/orgs/${orgId}/documents/${id}`, { method: 'DELETE' });
}

export function restoreDocument(orgId: string, id: string): Promise<DocumentMeta> {
  return apiFetch(`/api/orgs/${orgId}/documents/${id}/restore`, { method: 'POST' });
}

export function seedDocuments(_orgId: string, _data: DocumentMeta[]): Promise<DocumentMeta[]> {
  return Promise.resolve([]);
}
