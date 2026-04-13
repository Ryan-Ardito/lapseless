import { Hono } from 'hono';
import * as svc from '../services/document.service';
import { isOrgMember } from '../services/org.service';
import { getObjectSize } from '../lib/s3';
import { checkStorageLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';
import { uploadUrlSchema, registerDocumentSchema, updateDocumentSchema, uuidParam } from '../lib/validators';
import { db } from '../db';
import { obligations } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireRole } from '../middleware/require-role';
import type { OrgRole } from '../middleware/auth';

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const user = c.get('user');
  // Members see only their own docs; admin/owner can see all or filter by userId
  const userId = (orgRole === 'admin' || orgRole === 'owner')
    ? (c.req.query('userId') || undefined)
    : user.id;
  const docs = await svc.listDocuments(org.id, userId);
  return c.json(docs.map(toApiDocument));
});

app.post('/upload-url', requireRole('member'), async (c) => {
  const org = c.get('org');
  const body = uploadUrlSchema.parse(await c.req.json());
  await checkStorageLimit(org.id, body.size);
  const result = await svc.generateUploadUrl(org.id, body.fileName, body.mimeType, body.size);
  return c.json(result);
});

app.post('/', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const rawBody = await c.req.json();
  const body = registerDocumentSchema.parse(rawBody);

  // Verify s3Key belongs to this org
  if (!body.s3Key.startsWith(`uploads/${org.id}/`)) {
    throw new AppError(403, 'Invalid s3Key: does not belong to your account');
  }

  // Verify obligationId belongs to org if provided
  if (body.obligationId) {
    const [obl] = await db
      .select({ id: obligations.id })
      .from(obligations)
      .where(and(eq(obligations.id, body.obligationId), eq(obligations.organizationId, org.id), isNull(obligations.deletedAt)))
      .limit(1);
    if (!obl) throw new AppError(404, 'Obligation not found');
  }

  // Admin/owner can register documents for other members
  const targetUserId = (orgRole === 'admin' || orgRole === 'owner') && rawBody.targetUserId
    ? rawBody.targetUserId as string
    : user.id;

  if (targetUserId !== user.id && !(await isOrgMember(org.id, targetUserId))) {
    throw new AppError(400, 'Target user is not a member of this organization');
  }

  const actualSize = await getObjectSize(body.s3Key);
  await checkStorageLimit(org.id, actualSize);
  const doc = await svc.registerDocument(org.id, targetUserId, { ...body, size: actualSize });
  return c.json(toApiDocument(doc), 201);
});

app.get('/:id/download-url', async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only download their own documents
  if (orgRole === 'member') {
    const existing = await svc.getDocument(org.id, id);
    if (!existing) throw new AppError(404, 'Document not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only access your own documents');
  }

  const result = await svc.generateDownloadUrl(org.id, id);
  if (!result) throw new AppError(404, 'Document not found');
  return c.json(result);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only edit their own documents
  if (orgRole === 'member') {
    const existing = await svc.getDocument(org.id, id);
    if (!existing) throw new AppError(404, 'Document not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only edit your own documents');
  }

  const body = updateDocumentSchema.parse(await c.req.json());

  // Verify obligationId belongs to org if provided
  if (body.obligationId) {
    const [obl] = await db
      .select({ id: obligations.id })
      .from(obligations)
      .where(and(eq(obligations.id, body.obligationId), eq(obligations.organizationId, org.id), isNull(obligations.deletedAt)))
      .limit(1);
    if (!obl) throw new AppError(404, 'Obligation not found');
  }

  const doc = await svc.updateDocument(org.id, id, body);
  if (!doc) throw new AppError(404, 'Document not found');
  return c.json(toApiDocument(doc));
});

app.delete('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only delete their own documents
  if (orgRole === 'member') {
    const existing = await svc.getDocument(org.id, id);
    if (!existing) throw new AppError(404, 'Document not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only delete your own documents');
  }

  const doc = await svc.softDeleteDocument(org.id, id);
  if (!doc) throw new AppError(404, 'Document not found');
  return c.json(toApiDocument(doc));
});

app.post('/:id/restore', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only restore their own documents
  if (orgRole === 'member') {
    const existing = await svc.getDocument(org.id, id);
    if (!existing) throw new AppError(404, 'Document not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only restore your own documents');
  }

  const doc = await svc.restoreDocument(org.id, id);
  if (!doc) throw new AppError(404, 'Document not found');
  return c.json(toApiDocument(doc));
});

function toApiDocument(row: any) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName ?? undefined,
    type: row.mimeType,
    size: row.size,
    addedAt: row.addedAt?.toISOString?.() ?? row.addedAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
    obligationId: row.obligationId ?? undefined,
  };
}

export default app;
