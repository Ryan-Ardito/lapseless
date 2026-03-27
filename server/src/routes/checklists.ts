import { Hono } from 'hono';
import * as svc from '../services/checklist.service';
import { AppError } from '../middleware/error-handler';
import { createChecklistSchema, updateChecklistSchema, uuidParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const checklists = await svc.listChecklists(org.id);
  return c.json(checklists.map(toApiChecklist));
});

app.post('/', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const body = createChecklistSchema.parse(await c.req.json());
  const checklist = await svc.createChecklist(org.id, user.id, body);
  return c.json(toApiChecklist(checklist), 201);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
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
  const id = uuidParam.parse(c.req.param('id'));
  const checklist = await svc.softDeleteChecklist(org.id, id);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

app.post('/:id/restore', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
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
