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

// --- Blob storage (S3 via presigned URLs) ---

export async function saveDocument(orgId: string, file: File, obligationId?: string, targetUserId?: string): Promise<DocumentMeta> {
  const { uploadUrl, s3Key } = await apiFetch<{ uploadUrl: string; s3Key: string }>(
    `/api/orgs/${orgId}/documents/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    },
  );

  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  const body: Record<string, unknown> = {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    s3Key,
    obligationId,
  };
  if (targetUserId) body.targetUserId = targetUserId;

  return apiFetch<DocumentMeta>(`/api/orgs/${orgId}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getDocument(orgId: string, id: string): Promise<Blob | null> {
  const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(
    `/api/orgs/${orgId}/documents/${id}/download-url`,
  );
  const res = await fetch(downloadUrl);
  if (!res.ok) return null;
  return res.blob();
}

export async function deleteDocument(_orgId: string, _id: string): Promise<void> {
  // Handled by removeDocument in the API layer
}

export async function getStorageEstimate(_orgId: string): Promise<{ used: number; quota: number }> {
  return { used: 0, quota: 0 };
}
