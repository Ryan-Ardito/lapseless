import { Hono } from 'hono';
import * as svc from '../services/pto.service';
import { AppError } from '../middleware/error-handler';
import { createPtoEntrySchema, updatePtoEntrySchema, upsertPtoConfigSchema, uuidParam, parseYearParam } from '../lib/validators';

const app = new Hono();

app.get('/entries', async (c) => {
  const user = c.get('user');
  const year = parseYearParam(c.req.query('year'));
  const entries = await svc.listEntries(user.id, year);
  return c.json(entries.map(toApiEntry));
});

app.post('/entries', async (c) => {
  const user = c.get('user');
  const body = createPtoEntrySchema.parse(await c.req.json());
  const entry = await svc.createEntry(user.id, body);
  return c.json(toApiEntry(entry), 201);
});

app.patch('/entries/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updatePtoEntrySchema.parse(await c.req.json());
  const entry = await svc.updateEntry(user.id, id, body);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.delete('/entries/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const entry = await svc.softDeleteEntry(user.id, id);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.post('/entries/:id/restore', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const entry = await svc.restoreEntry(user.id, id);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.get('/config', async (c) => {
  const user = c.get('user');
  const year = parseYearParam(c.req.query('year')) ?? new Date().getFullYear();
  const config = await svc.getConfig(user.id, year);
  return c.json(config);
});

app.patch('/config', async (c) => {
  const user = c.get('user');
  const body = upsertPtoConfigSchema.parse(await c.req.json());
  const config = await svc.upsertConfig(user.id, body);
  return c.json(config);
});

function toApiEntry(row: any) {
  return {
    id: row.id,
    date: row.date,
    hours: row.hours,
    type: row.type,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

export default app;
