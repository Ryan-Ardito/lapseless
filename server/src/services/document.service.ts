import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createPresignedUploadUrl, createPresignedDownloadUrl } from '../lib/s3';

export async function listDocuments(userId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)));
}

export async function registerDocument(
  userId: string,
  data: {
    name: string;
    displayName?: string;
    mimeType: string;
    size: number;
    s3Key: string;
    obligationId?: string;
  },
) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      name: data.name,
      displayName: data.displayName,
      mimeType: data.mimeType,
      size: data.size,
      s3Key: data.s3Key,
      obligationId: data.obligationId,
    })
    .returning();
  return doc;
}

export async function updateDocument(userId: string, id: string, updates: Partial<{
  displayName: string;
}>) {
  const [doc] = await db
    .update(documents)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();
  return doc;
}

export async function softDeleteDocument(userId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  if (!doc) return null;

  const [deleted] = await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();
  return deleted;
}

export async function restoreDocument(userId: string, id: string) {
  const [doc] = await db
    .update(documents)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();
  return doc;
}

export async function generateUploadUrl(userId: string, fileName: string, mimeType: string, size: number) {
  const key = `uploads/${userId}/${crypto.randomUUID()}/${sanitizeFileName(fileName)}`;
  const uploadUrl = await createPresignedUploadUrl(key, mimeType, size);
  return { uploadUrl, s3Key: key };
}

export async function generateDownloadUrl(userId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  if (!doc) return null;

  const downloadUrl = await createPresignedDownloadUrl(doc.s3Key, doc.displayName ?? doc.name);
  return { downloadUrl };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
