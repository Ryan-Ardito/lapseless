import { Hono } from 'hono';
import * as orgSvc from '../services/org.service';
import { checkOrgLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

// List all orgs the user belongs to
app.get('/', async (c) => {
  const user = c.get('user');
  const orgs = await orgSvc.listUserOrgs(user.id);
  return c.json(orgs);
});

// Create a new org
app.post('/', async (c) => {
  const user = c.get('user');
  await checkOrgLimit(user.id);
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) throw new AppError(400, 'Organization name is required');
  const org = await orgSvc.createOrg(user.id, name.trim());
  return c.json(org, 201);
});

export default app;
