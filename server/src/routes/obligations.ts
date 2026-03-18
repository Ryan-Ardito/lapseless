import { Hono } from 'hono';
import * as svc from '../services/obligation.service';
import { checkObligationLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';
import { createObligationSchema, updateObligationSchema, uuidParam, parseCategoryParam } from '../lib/validators';

const app = new Hono();

app.get('/', async (c) => {
  const user = c.get('user');
  const category = parseCategoryParam(c.req.query('category'));
  const status = c.req.query('status');
  const completed = status === 'completed' ? true : status === 'active' ? false : undefined;
  const results = await svc.listObligations(user.id, { category, completed });

  return c.json(results.map(toApiObligation));
});

app.post('/', async (c) => {
  const user = c.get('user');
  await checkObligationLimit(user.id);
  const body = createObligationSchema.parse(await c.req.json());
  const obligation = await svc.createObligation(user.id, {
    name: body.name,
    category: body.category,
    dueDate: body.dueDate,
    startDate: body.startDate,
    notes: body.notes,
    links: body.links,
    recurrenceType: body.recurrence?.type,
    recurrenceAutoRenew: body.recurrence?.autoRenew,
    ceuRequired: body.ceuTracking?.required,
    ceuCompleted: body.ceuTracking?.completed,
    notificationChannels: body.notification?.channels,
    reminderDaysBefore: body.notification?.reminderDaysBefore,
    reminderFrequency: body.notification?.reminderFrequency,
  });
  return c.json(toApiObligation(obligation), 201);
});

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const body = updateObligationSchema.parse(await c.req.json());

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.links !== undefined) updates.links = body.links;
  if (body.recurrence !== undefined) {
    updates.recurrenceType = body.recurrence?.type ?? null;
    updates.recurrenceAutoRenew = body.recurrence?.autoRenew ?? false;
  }
  if (body.ceuTracking !== undefined) {
    updates.ceuRequired = body.ceuTracking?.required ?? null;
    updates.ceuCompleted = body.ceuTracking?.completed ?? null;
  }
  if (body.notification !== undefined) {
    updates.notificationChannels = body.notification.channels;
    updates.reminderDaysBefore = body.notification.reminderDaysBefore;
    updates.reminderFrequency = body.notification.reminderFrequency;
    if (body.notification.muted !== undefined) updates.notificationsMuted = body.notification.muted;
  }
  if (body.completed !== undefined) updates.completed = body.completed;

  const obligation = await svc.updateObligation(user.id, id, updates);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  return c.json(toApiObligation(obligation));
});

app.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const obligation = await svc.softDeleteObligation(user.id, id);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  return c.json(toApiObligation(obligation));
});

app.post('/:id/restore', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const obligation = await svc.restoreObligation(user.id, id);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  return c.json(toApiObligation(obligation));
});

app.post('/:id/toggle', async (c) => {
  const user = c.get('user');
  const id = uuidParam.parse(c.req.param('id'));
  const result = await svc.toggleComplete(user.id, id);
  if (!result) throw new AppError(404, 'Obligation not found');
  return c.json({
    updated: toApiObligation(result.updated),
    renewed: result.renewed ? toApiObligation(result.renewed) : undefined,
  });
});

/** Map DB row → frontend Obligation shape */
function toApiObligation(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    dueDate: row.dueDate,
    startDate: row.startDate ?? undefined,
    referenceNumber: row.referenceNumber ?? undefined,
    notes: row.notes,
    links: row.links ?? undefined,
    recurrence: row.recurrenceType
      ? { type: row.recurrenceType, autoRenew: row.recurrenceAutoRenew }
      : undefined,
    ceuTracking: row.ceuRequired != null
      ? { required: row.ceuRequired, completed: row.ceuCompleted ?? 0 }
      : undefined,
    notification: {
      channels: row.notificationChannels ?? [],
      reminderDaysBefore: row.reminderDaysBefore,
      reminderFrequency: row.reminderFrequency ?? undefined,
      muted: row.notificationsMuted,
    },
    completed: row.completed,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

export default app;
