import type { DocumentMeta } from '../types/obligation';
import { apiFetch } from '../api/http/client';

export async function saveDocument(file: File): Promise<DocumentMeta> {
  // 1. Get presigned upload URL
  const { uploadUrl, s3Key } = await apiFetch<{ uploadUrl: string; s3Key: string }>(
    '/api/documents/upload-url',
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
  const doc = await apiFetch<DocumentMeta>('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      s3Key,
    }),
  });

  return doc;
}

export async function getDocument(id: string): Promise<Blob | null> {
  const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(
    `/api/documents/${id}/download-url`,
  );
  const res = await fetch(downloadUrl);
  if (!res.ok) return null;
  return res.blob();
}

export async function deleteDocument(_id: string): Promise<void> {
  // Handled by removeDocument in the API layer
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number }> {
  // Not relevant for S3 storage
  return { used: 0, quota: 0 };
}
