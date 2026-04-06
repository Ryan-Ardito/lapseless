import { Hono } from 'hono';
import * as svc from '../services/checklist.service';
import { AppError } from '../middleware/error-handler';
import { createChecklistSchema, updateChecklistSchema, uuidParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const user = c.get('user');
  const userId = (orgRole === 'admin' || orgRole === 'owner')
    ? (c.req.query('userId') || undefined)
    : user.id;
  const checklists = await svc.listChecklists(org.id, userId);
  return c.json(checklists.map(toApiChecklist));
});

app.post('/', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const rawBody = await c.req.json();
  const body = createChecklistSchema.parse(rawBody);

  // Admin/owner can create checklists for other members
  const targetUserId = (orgRole === 'admin' || orgRole === 'owner') && rawBody.targetUserId
    ? rawBody.targetUserId as string
    : user.id;

  const checklist = await svc.createChecklist(org.id, targetUserId, body);
  return c.json(toApiChecklist(checklist), 201);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  if (orgRole === 'member') {
    const existing = await svc.getChecklist(org.id, id);
    if (!existing) throw new AppError(404, 'Checklist not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only edit your own checklists');
  }

  const body = updateChecklistSchema.parse(await c.req.json());
  const { completedAt, ...rest } = body;
  const updates: Parameters<typeof svc.updateChecklist>[2] = { ...rest };
  if (completedAt !== undefined) {
    updates.completedAt = completedAt ? new Date(completedAt) : null;
  }
  const checklist = await svc.updateChecklist(org.id, id, updates);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

app.delete('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  if (orgRole === 'member') {
    const existing = await svc.getChecklist(org.id, id);
    if (!existing) throw new AppError(404, 'Checklist not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only delete your own checklists');
  }

  const checklist = await svc.softDeleteChecklist(org.id, id);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

app.post('/:id/restore', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  if (orgRole === 'member') {
    const existing = await svc.getChecklist(org.id, id);
    if (!existing) throw new AppError(404, 'Checklist not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only restore your own checklists');
  }

  const checklist = await svc.restoreChecklist(org.id, id);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

function toApiChecklist(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    period: row.period,
    items: row.items,
    completedAt: row.completedAt?.toISOString?.() ?? row.completedAt ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

export default app;
