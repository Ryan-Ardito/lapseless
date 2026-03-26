import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import * as svc from '../services/profile.service';
import * as obligationSvc from '../services/obligation.service';
import * as documentSvc from '../services/document.service';
import * as ptoSvc from '../services/pto.service';
import * as checklistSvc from '../services/checklist.service';
import * as notificationSvc from '../services/notification.service';
import * as settingsSvc from '../services/settings.service';
import { deleteAllSessions } from '../services/auth.service';
import { AppError } from '../middleware/error-handler';
import { updateProfileSchema } from '../lib/validators';
import { db } from '../db';
import { consent, ptoConfig } from '../db/schema';

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

app.get('/export', async (c) => {
  const user = c.get('user');
  const userId = user.id;

  const [profile, obligations, documents, ptoEntries, ptoConfigs, checklists, notifications, settings, consentRow] = await Promise.all([
    svc.getProfile(userId),
    obligationSvc.listObligations(userId),
    documentSvc.listDocuments(userId),
    ptoSvc.listEntries(userId),
    db.select().from(ptoConfig).where(eq(ptoConfig.userId, userId)),
    checklistSvc.listChecklists(userId),
    notificationSvc.listNotifications(userId),
    settingsSvc.getSettings(userId),
    db.select().from(consent).where(eq(consent.userId, userId)).limit(1),
  ]);

  return c.json({
    profile,
    obligations,
    documents: documents.map(({ s3Key, ...rest }) => rest),
    ptoEntries,
    ptoConfig: ptoConfigs,
    checklists,
    notifications,
    settings,
    consent: consentRow[0] ?? null,
  });
});

app.delete('/', async (c) => {
  const user = c.get('user');
  await svc.deleteAccount(user.id);
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ ok: true });
});

app.post('/logout-all', async (c) => {
  const user = c.get('user');
  await deleteAllSessions(user.id);
  deleteCookie(c, 'session');
  return c.json({ ok: true });
});

export default app;
