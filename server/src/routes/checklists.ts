import { Hono } from 'hono';
import * as svc from '../services/checklist.service';
import { AppError } from '../middleware/error-handler';
import { createChecklistSchema, updateChecklistSchema, uuidParam } from '../lib/validators';

const app = new Hono();

app.get('/', async (c) => {
  const user = c.get('user');
  const checklists = await svc.listChecklists(user.id);
  return c.json(checklists.map(toApiChecklist));
});

app.post('/', async (c) => {
  const user = c.get('user');
  const body = createChecklistSchema.parse(await c.req.json());
  const checklist = await svc.createChecklist(user.id, body);
  return c.json(toApiChecklist(checklist), 201);
});

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updateChecklistSchema.parse(await c.req.json());
  const checklist = await svc.updateChecklist(user.id, id, body);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const checklist = await svc.softDeleteChecklist(user.id, id);
  if (!checklist) throw new AppError(404, 'Checklist not found');
  return c.json(toApiChecklist(checklist));
});

app.post('/:id/restore', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const checklist = await svc.restoreChecklist(user.id, id);
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
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

export default app;
