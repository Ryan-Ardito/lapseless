import { Hono } from 'hono';
import { db } from '../db';
import { consent } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { upsertConsentSchema, updateSettingsSchema } from '../lib/validators';
import { getSettings, upsertSettings } from '../services/settings.service';

const app = new Hono();

// --- User settings ---

app.get('/', async (c) => {
  const user = c.get('user');
  const settings = await getSettings(user.id);
  return c.json(settings);
});

app.patch('/', async (c) => {
  const user = c.get('user');
  const body = updateSettingsSchema.parse(await c.req.json());
  const settings = await upsertSettings(user.id, body);
  return c.json(settings);
});

// --- Consent ---

app.get('/consent', async (c) => {
  const user = c.get('user');
  const [row] = await db
    .select()
    .from(consent)
    .where(eq(consent.userId, user.id))
    .limit(1);

  if (!row) return c.json(null);
  return c.json({
    version: row.version,
    acceptedAt: row.acceptedAt.toISOString(),
    essential: row.essential,
    documentStorage: row.documentStorage,
    notificationData: row.notificationData,
    analytics: row.analytics,
  });
});

app.put('/consent', async (c) => {
  const user = c.get('user');
  const body = upsertConsentSchema.parse(await c.req.json());

  const existing = await db
    .select()
    .from(consent)
    .where(eq(consent.userId, user.id))
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(consent)
      .set({
        version: body.version,
        essential: body.essential ?? true,
        documentStorage: body.documentStorage ?? false,
        notificationData: body.notificationData ?? false,
        analytics: body.analytics ?? false,
        updatedAt: new Date(),
      })
      .where(eq(consent.userId, user.id))
      .returning();
    return c.json(row);
  }

  const [row] = await db
    .insert(consent)
    .values({
      userId: user.id,
      version: body.version,
      essential: body.essential ?? true,
      documentStorage: body.documentStorage ?? false,
      notificationData: body.notificationData ?? false,
      analytics: body.analytics ?? false,
    })
    .returning();
  return c.json(row, 201);
});

app.delete('/consent', async (c) => {
  const user = c.get('user');
  await db.delete(consent).where(eq(consent.userId, user.id));
  return c.json({ ok: true });
});

export default app;
