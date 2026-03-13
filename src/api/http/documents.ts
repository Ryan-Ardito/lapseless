import type { DocumentMeta } from '../../types/obligation';
import { apiFetch } from './client';

export function getDocuments(): Promise<DocumentMeta[]> {
  return apiFetch('/api/documents');
}

export function addDocument(doc: DocumentMeta): Promise<DocumentMeta> {
  // In HTTP mode, documents are registered via the upload flow in utils/documents.http.ts
  return Promise.resolve(doc);
}

export function updateDocument(
  id: string,
  updates: Partial<Pick<DocumentMeta, 'displayName'>>,
): Promise<DocumentMeta> {
  return apiFetch(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function removeDocument(id: string): Promise<DocumentMeta> {
  return apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
}

export function restoreDocument(id: string): Promise<DocumentMeta> {
  return apiFetch(`/api/documents/${id}/restore`, { method: 'POST' });
}

export function seedDocuments(_data: DocumentMeta[]): Promise<DocumentMeta[]> {
  return Promise.resolve([]);
}
