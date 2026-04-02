import { Hono } from 'hono';
import * as svc from '../services/history.service';
import { AppError } from '../middleware/error-handler';
import { createHistoryEntrySchema, updateHistoryEntrySchema, uuidParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';
import type { OrgRole } from '../middleware/auth';

function resolveUserId(orgRole: OrgRole, currentUserId: string, queryUserId?: string): string | undefined {
  if (orgRole === 'admin' || orgRole === 'owner') {
    return queryUserId || undefined;
  }
  return currentUserId;
}

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const userId = resolveUserId(orgRole, user.id, c.req.query('userId'));
  const entries = await svc.listHistory(org.id, userId);
  return c.json(entries.map(toApiHistoryEntry));
});

app.post('/', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const body = createHistoryEntrySchema.parse(await c.req.json());
  const entry = await svc.createHistoryEntry(org.id, user.id, body);
  return c.json(toApiHistoryEntry(entry), 201);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updateHistoryEntrySchema.parse(await c.req.json());
  const entry = await svc.updateHistoryEntry(org.id, id, body);
  if (!entry) throw new AppError(404, 'History entry not found');
  return c.json(toApiHistoryEntry(entry));
});

app.delete('/', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const userId = orgRole === 'member' ? user.id : undefined;
  await svc.clearHistory(org.id, userId);
  return c.body(null, 204);
});

function toApiHistoryEntry(row: any) {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    action: row.action,
    before: row.before ?? null,
    after: row.after ?? null,
    timestamp: row.createdAt?.toISOString?.() ?? row.createdAt,
    undone: row.undone,
    renewedId: row.renewedId ?? undefined,
    userId: row.userId,
    userName: row.userName ?? undefined,
    userAvatarUrl: row.userAvatarUrl ?? undefined,
  };
}

export default app;
