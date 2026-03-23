import { Hono } from 'hono';
import { db } from '../db';
import { obligations, subscriptions } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { PLAN_LIMITS, type Tier } from '../lib/plan-limits';
import * as svc from '../services/notification.service';
import { sendSms } from '../services/sms.service';
import { checkSmsLimit } from '../middleware/plan-enforcement';

const app = new Hono();

app.get('/', async (c) => {
  const user = c.get('user');
  const notifications = await svc.listNotifications(user.id);
  return c.json(notifications.map(toApiNotification));
});

app.post('/mark-all-read', async (c) => {
  const user = c.get('user');
  await svc.markAllRead(user.id);
  return c.json({ ok: true });
});

app.post('/clear', async (c) => {
  const user = c.get('user');
  await svc.clearAll(user.id);
  return c.json({ ok: true });
});

app.get('/sms-credits', async (c) => {
  const user = c.get('user');

  const [sub] = await db
    .select({
      smsUsedThisMonth: subscriptions.smsUsedThisMonth,
      tier: subscriptions.tier,
      smsResetAt: subscriptions.smsResetAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const tier = (sub?.tier ?? 'solo') as Tier;
  const used = sub?.smsUsedThisMonth ?? 0;
  const limit = PLAN_LIMITS[tier].smsPerMonth;
  const resetAt = sub?.smsResetAt?.toISOString() ?? null;

  // Calculate projected monthly usage from active obligations with SMS
  const activeObligations = await db
    .select({
      reminderFrequency: obligations.reminderFrequency,
      notificationChannels: obligations.notificationChannels,
      notificationsMuted: obligations.notificationsMuted,
    })
    .from(obligations)
    .where(
      and(
        eq(obligations.userId, user.id),
        eq(obligations.completed, false),
        isNull(obligations.deletedAt),
      ),
    );

  let projected = 0;
  let obligationsWithSms = 0;
  for (const obl of activeObligations) {
    if (obl.notificationsMuted) continue;
    const channels = (obl.notificationChannels ?? []) as string[];
    if (!channels.includes('sms')) continue;
    obligationsWithSms++;
    const freq = obl.reminderFrequency ?? 'once';
    if (freq === 'daily') projected += 30;
    else if (freq === 'weekly') projected += 4;
    else projected += 1;
  }

  return c.json({ used, limit, resetAt, projected, obligationsWithSms });
});

app.post('/test-sms', async (c) => {
  const user = c.get('user');
  if (!user.phoneVerified) {
    return c.json({ error: 'Phone not verified. Set up your phone number in Settings first.' }, 400);
  }
  await checkSmsLimit(user.id);
  await sendSms(user.id, user.phone, 'Test SMS from The Practice Atlas');
  return c.json({ ok: true });
});

function toApiNotification(row: any) {
  return {
    id: row.id,
    obligationId: row.obligationId,
    obligationName: row.obligationName,
    channel: row.channel,
    message: row.message,
    triggeredAt: row.triggeredAt?.toISOString?.() ?? row.triggeredAt,
    read: row.read,
  };
}

export default app;
