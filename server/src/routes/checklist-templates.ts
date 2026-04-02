import { Hono } from 'hono';
import * as svc from '../services/checklist-template.service';
import * as checklistSvc from '../services/checklist.service';
import { AppError } from '../middleware/error-handler';
import { createChecklistTemplateSchema, updateChecklistTemplateSchema, uuidParam } from '../lib/validators';
import { requireRole } from '../middleware/require-role';

const app = new Hono();

app.get('/', async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const templates = await svc.listTemplates(org.id, user.id);
  return c.json(templates.map(toApiTemplate));
});

app.post('/', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const body = createChecklistTemplateSchema.parse(await c.req.json());

  if (body.isOrg && orgRole !== 'admin' && orgRole !== 'owner') {
    throw new AppError(403, 'Only admins can create org templates');
  }

  const userId = body.isOrg ? null : user.id;
  const template = await svc.createTemplate(org.id, userId, {
    name: body.name,
    items: body.items,
  });
  return c.json(toApiTemplate(template), 201);
});

app.patch('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  const existing = await svc.getTemplate(org.id, id);
  if (!existing) throw new AppError(404, 'Template not found');

  if (existing.userId === null) {
    if (orgRole !== 'admin' && orgRole !== 'owner') {
      throw new AppError(403, 'Only admins can edit org templates');
    }
  } else if (existing.userId !== user.id) {
    throw new AppError(403, 'You can only edit your own templates');
  }

  const body = updateChecklistTemplateSchema.parse(await c.req.json());
  const template = await svc.updateTemplate(org.id, id, body);
  if (!template) throw new AppError(404, 'Template not found');
  return c.json(toApiTemplate(template));
});

app.delete('/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const id = uuidParam.parse(c.req.param('id'));

  const existing = await svc.getTemplate(org.id, id);
  if (!existing) throw new AppError(404, 'Template not found');

  if (existing.userId === null) {
    if (orgRole !== 'admin' && orgRole !== 'owner') {
      throw new AppError(403, 'Only admins can delete org templates');
    }
  } else if (existing.userId !== user.id) {
    throw new AppError(403, 'You can only delete your own templates');
  }

  await svc.deleteTemplate(org.id, id);
  return c.json({ ok: true });
});

app.post('/from-checklist/:id', requireRole('member'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');
  const checklistId = uuidParam.parse(c.req.param('id'));

  const checklist = await checklistSvc.getChecklist(org.id, checklistId);
  if (!checklist) throw new AppError(404, 'Checklist not found');

  const body = createChecklistTemplateSchema.parse(await c.req.json());

  if (body.isOrg && orgRole !== 'admin' && orgRole !== 'owner') {
    throw new AppError(403, 'Only admins can create org templates');
  }

  const userId = body.isOrg ? null : user.id;
  const template = await svc.createTemplate(org.id, userId, {
    name: body.name,
    items: body.items,
  });
  return c.json(toApiTemplate(template), 201);
});

function toApiTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    items: row.items,
    isOrg: row.userId === null,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

export default app;
