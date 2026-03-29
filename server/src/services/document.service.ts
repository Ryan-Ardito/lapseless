import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createPresignedUploadUrl, createPresignedDownloadUrl } from '../lib/s3';

export async function listDocuments(orgId: string, userId?: string) {
  const conditions = [eq(documents.organizationId, orgId), isNull(documents.deletedAt)];
  if (userId) {
    conditions.push(eq(documents.userId, userId));
  }
  return db
    .select()
    .from(documents)
    .where(and(...conditions));
}

export async function getDocument(orgId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .limit(1);
  return doc;
}

export async function registerDocument(
  orgId: string,
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
      organizationId: orgId,
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

export async function updateDocument(orgId: string, id: string, updates: Partial<{
  displayName: string;
  obligationId: string | null;
}>) {
  const [doc] = await db
    .update(documents)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .returning();
  return doc;
}

export async function softDeleteDocument(orgId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .limit(1);

  if (!doc) return null;

  const [deleted] = await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .returning();
  return deleted;
}

export async function restoreDocument(orgId: string, id: string) {
  const [doc] = await db
    .update(documents)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .returning();
  return doc;
}

export async function generateUploadUrl(orgId: string, fileName: string, mimeType: string, size: number) {
  const key = `uploads/${orgId}/${crypto.randomUUID()}/${sanitizeFileName(fileName)}`;
  const uploadUrl = await createPresignedUploadUrl(key, mimeType, size);
  return { uploadUrl, s3Key: key };
}

export async function generateDownloadUrl(orgId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.organizationId, orgId)))
    .limit(1);

  if (!doc) return null;

  const downloadUrl = await createPresignedDownloadUrl(doc.s3Key, doc.displayName ?? doc.name);
  return { downloadUrl };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
