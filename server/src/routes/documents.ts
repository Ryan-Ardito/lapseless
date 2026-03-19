import { Hono } from 'hono';
import * as svc from '../services/document.service';
import { getObjectSize } from '../lib/s3';
import { checkStorageLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';
import { uploadUrlSchema, registerDocumentSchema, updateDocumentSchema, uuidParam } from '../lib/validators';
import { db } from '../db';
import { obligations } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const user = c.get('user');
  const docs = await svc.listDocuments(user.id);
  return c.json(docs.map(toApiDocument));
});

app.post('/upload-url', async (c) => {
  const user = c.get('user');
  const body = uploadUrlSchema.parse(await c.req.json());
  await checkStorageLimit(user.id, body.size);
  const result = await svc.generateUploadUrl(user.id, body.fileName, body.mimeType, body.size);
  return c.json(result);
});

app.post('/', async (c) => {
  const user = c.get('user');
  const body = registerDocumentSchema.parse(await c.req.json());

  // Verify s3Key belongs to this user
  if (!body.s3Key.startsWith(`uploads/${user.id}/`)) {
    throw new AppError(403, 'Invalid s3Key: does not belong to your account');
  }

  // Verify obligationId belongs to user if provided
  if (body.obligationId) {
    const [obl] = await db
      .select({ id: obligations.id })
      .from(obligations)
      .where(and(eq(obligations.id, body.obligationId), eq(obligations.userId, user.id), isNull(obligations.deletedAt)))
      .limit(1);
    if (!obl) throw new AppError(404, 'Obligation not found');
  }

  const actualSize = await getObjectSize(body.s3Key);
  await checkStorageLimit(user.id, actualSize);
  const doc = await svc.registerDocument(user.id, { ...body, size: actualSize });
  return c.json(toApiDocument(doc), 201);
});

app.get('/:id/download-url', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const result = await svc.generateDownloadUrl(user.id, id);
  if (!result) throw new AppError(404, 'Document not found');
  return c.json(result);
});

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updateDocumentSchema.parse(await c.req.json());
  const doc = await svc.updateDocument(user.id, id, body);
  if (!doc) throw new AppError(404, 'Document not found');
  return c.json(toApiDocument(doc));
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const doc = await svc.softDeleteDocument(user.id, id);
  if (!doc) throw new AppError(404, 'Document not found');
  return c.json(toApiDocument(doc));
});

app.post('/:id/restore', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const doc = await svc.restoreDocument(user.id, id);
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
