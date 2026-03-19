import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import * as svc from '../services/profile.service';
import { deleteAllSessions } from '../services/auth.service';
import { AppError } from '../middleware/error-handler';
import { updateProfileSchema } from '../lib/validators';

const app = new Hono();

app.get('/', async (c) => {
  const user = c.get('user');
  const profile = await svc.getProfile(user.id);
  if (!profile) throw new AppError(404, 'Profile not found');
  return c.json(profile);
});

app.patch('/', async (c) => {
  const user = c.get('user');
  const body = updateProfileSchema.parse(await c.req.json());
  const profile = await svc.updateProfile(user.id, body);
  if (!profile) throw new AppError(404, 'Profile not found');
  return c.json(profile);
});

app.post('/logout-all', async (c) => {
  const user = c.get('user');
  await deleteAllSessions(user.id);
  deleteCookie(c, 'session');
  return c.json({ ok: true });
});

export default app;
