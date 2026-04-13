import { Hono } from 'hono';
import * as svc from '../services/obligation.service';
import { isOrgMember } from '../services/org.service';
import { checkObligationLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';
import { createObligationSchema, updateObligationSchema, uuidParam, parseCategoryParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';
import type { OrgRole } from '../middleware/auth';

/** Members see only their own data; admin/owner can see all or filter by userId */
function resolveUserId(orgRole: OrgRole, currentUserId: string, queryUserId?: string): string | undefined {
  if (orgRole === 'admin' || orgRole === 'owner') {
    return queryUserId || undefined; // undefined = all users
  }
  return currentUserId; // members only see their own
}

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const user = c.get('user');
  const category = parseCategoryParam(c.req.query('category'));
  const status = c.req.query('status');
  const completed = status === 'completed' ? true : status === 'active' ? false : undefined;
  const userId = resolveUserId(orgRole, user.id, c.req.query('userId'));
  const results = await svc.listObligations(org.id, { category, completed, userId });

  const obligationIds = results.map((r) => r.id);
  const docs = await svc.getDocumentsForObligations(org.id, obligationIds);
  const docsByObligation = new Map<string, any[]>();
  for (const doc of docs) {
    const list = docsByObligation.get(doc.obligationId!) ?? [];
    list.push(doc);
    docsByObligation.set(doc.obligationId!, list);
  }

  return c.json(results.map((r) => toApiObligation(r, docsByObligation.get(r.id))));
});

app.post('/', requireRole('member'), async (c) => {
  const user = c.get('user');
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  await checkObligationLimit(org.id);
  const rawBody = await c.req.json();
  const body = createObligationSchema.parse(rawBody);

  // Admin/owner can create obligations for other members via targetUserId
  const targetUserId = (orgRole === 'admin' || orgRole === 'owner') && rawBody.targetUserId
    ? rawBody.targetUserId as string
    : user.id;

  if (targetUserId !== user.id && !(await isOrgMember(org.id, targetUserId))) {
    throw new AppError(400, 'Target user is not a member of this organization');
  }

  const obligation = await svc.createObligation(org.id, targetUserId, {
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
    reminderDates: body.notification?.reminderDates,
    reminderTime: body.notification?.reminderTime,
  });
  return c.json(toApiObligation(obligation), 201);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only edit their own obligations
  if (orgRole === 'member') {
    const existing = await svc.getObligation(org.id, id);
    if (!existing) throw new AppError(404, 'Obligation not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only edit your own obligations');
  }

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
    if (body.notification.reminderDates !== undefined) updates.reminderDates = body.notification.reminderDates;
    if (body.notification.reminderTime !== undefined) updates.reminderTime = body.notification.reminderTime;
    if (body.notification.muted !== undefined) updates.notificationsMuted = body.notification.muted;
  }
  if (body.completed !== undefined) updates.completed = body.completed;

  const obligation = await svc.updateObligation(org.id, id, updates);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  const docs = await getObligationDocs(org.id, id);
  return c.json(toApiObligation(obligation, docs));
});

app.delete('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only delete their own obligations
  if (orgRole === 'member') {
    const existing = await svc.getObligation(org.id, id);
    if (!existing) throw new AppError(404, 'Obligation not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only delete your own obligations');
  }

  const obligation = await svc.softDeleteObligation(org.id, id);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  const deleteDocs = await getObligationDocs(org.id, id);
  return c.json(toApiObligation(obligation, deleteDocs));
});

app.post('/:id/restore', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only restore their own obligations
  if (orgRole === 'member') {
    const existing = await svc.getObligation(org.id, id);
    if (!existing) throw new AppError(404, 'Obligation not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only restore your own obligations');
  }

  const obligation = await svc.restoreObligation(org.id, id);
  if (!obligation) throw new AppError(404, 'Obligation not found');
  const restoreDocs = await getObligationDocs(org.id, id);
  return c.json(toApiObligation(obligation, restoreDocs));
});

app.post('/:id/toggle', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  // Members can only toggle their own obligations
  if (orgRole === 'member') {
    const existing = await svc.getObligation(org.id, id);
    if (!existing) throw new AppError(404, 'Obligation not found');
    if (existing.userId !== user.id) throw new AppError(403, 'You can only modify your own obligations');
  }

  const result = await svc.toggleComplete(org.id, id);
  if (!result) throw new AppError(404, 'Obligation not found');
  const toggleDocs = await getObligationDocs(org.id, id);
  return c.json({
    updated: toApiObligation(result.updated, toggleDocs),
    renewed: result.renewed ? toApiObligation(result.renewed) : undefined,
  });
});

async function getObligationDocs(orgId: string, obligationId: string) {
  const docs = await svc.getDocumentsForObligations(orgId, [obligationId]);
  return docs;
}

/** Map DB row → frontend Obligation shape */
function toApiObligation(row: any, docs?: any[]) {
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
    documents: docs?.map(toApiDocumentMini),
    notification: {
      channels: row.notificationChannels ?? [],
      reminderDaysBefore: row.reminderDaysBefore,
      reminderFrequency: row.reminderFrequency ?? undefined,
      reminderDates: row.reminderDates ?? [],
      reminderTime: row.reminderTime ?? undefined,
      muted: row.notificationsMuted,
    },
    completed: row.completed,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    deletedAt: row.deletedAt?.toISOString?.() ?? row.deletedAt ?? undefined,
  };
}

function toApiDocumentMini(doc: any) {
  return {
    id: doc.id,
    name: doc.name,
    displayName: doc.displayName ?? undefined,
    type: doc.mimeType,
    size: Number(doc.size),
    addedAt: doc.addedAt?.toISOString?.() ?? doc.addedAt,
    obligationId: doc.obligationId ?? undefined,
  };
}

export default app;
