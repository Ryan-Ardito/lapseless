import { Hono } from 'hono';
import * as svc from '../services/pto.service';
import { AppError } from '../middleware/error-handler';
import { createPtoEntrySchema, updatePtoEntrySchema, upsertPtoConfigSchema, uuidParam, parseYearParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';

const app = new Hono();

app.get('/entries', async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const year = parseYearParam(c.req.query('year'));
  const entries = await svc.listEntries(org.id, user.id, year);
  return c.json(entries.map(toApiEntry));
});

app.post('/entries', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const body = createPtoEntrySchema.parse(await c.req.json());
  const entry = await svc.createEntry(org.id, user.id, body);
  return c.json(toApiEntry(entry), 201);
});

app.patch('/entries/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updatePtoEntrySchema.parse(await c.req.json());
  const entry = await svc.updateEntry(org.id, id, body);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.delete('/entries/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
  const entry = await svc.softDeleteEntry(org.id, id);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.post('/entries/:id/restore', requireRole('member'), async (c) => {
  const org = c.get('org');
  const id = uuidParam.parse(c.req.param('id'));
  const entry = await svc.restoreEntry(org.id, id);
  if (!entry) throw new AppError(404, 'PTO entry not found');
  return c.json(toApiEntry(entry));
});

app.get('/config', async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const year = parseYearParam(c.req.query('year')) ?? new Date().getFullYear();
  const config = await svc.getConfig(org.id, user.id, year);
  return c.json(config);
});

app.patch('/config', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const body = upsertPtoConfigSchema.parse(await c.req.json());
  const config = await svc.upsertConfig(org.id, user.id, body);
  return c.json(config);
});

function toApiEntry(row: any) {
  return {
    id: row.id,
    startDate: row.startDate,
    endDate: row.endDate,
    hours: row.hours,
    type: row.type,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

export default app;
