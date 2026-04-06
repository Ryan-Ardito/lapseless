import type { DocumentMeta } from '../types/obligation';
import { apiFetch } from '../api/http/client';

export async function saveDocument(orgId: string, file: File, obligationId?: string, targetUserId?: string): Promise<DocumentMeta> {
  // 1. Get presigned upload URL
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

  // 2. Upload file directly to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // 3. Register document in backend
  const body: Record<string, unknown> = {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    s3Key,
    obligationId,
  };
  if (targetUserId) body.targetUserId = targetUserId;

  const doc = await apiFetch<DocumentMeta>(`/api/orgs/${orgId}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return doc;
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
  // Not relevant for S3 storage
  return { used: 0, quota: 0 };
}
