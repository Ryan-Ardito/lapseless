import { Hono } from 'hono';
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

app.post('/test-sms', async (c) => {
  const user = c.get('user');
  if (!user.phoneVerified) {
    return c.json({ error: 'Phone not verified. Enable two-factor authentication first.' }, 400);
  }
  await checkSmsLimit(user.id);
  await sendSms(user.id, user.phone, 'Test SMS from Lapseless');
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
