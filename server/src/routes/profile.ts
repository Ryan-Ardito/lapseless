import { Hono } from 'hono';
import * as svc from '../services/profile.service';
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

export default app;
