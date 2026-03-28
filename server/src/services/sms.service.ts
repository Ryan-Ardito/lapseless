import { db } from '../db';
import { subscriptions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { twilioClient } from '../lib/twilio';

export async function sendSms(
  billingUserId: string,
  to: string,
  body: string,
  opts?: { transactional?: boolean },
) {
  const finalBody = opts?.transactional
    ? body
    : `${body}\n\nReply STOP to unsubscribe`;
  await twilioClient.sendSms({ to, body: finalBody });

  // Atomic increment of SMS usage on the billing user's (org owner's) subscription
  await db
    .update(subscriptions)
    .set({
      smsUsedThisMonth: sql`${subscriptions.smsUsedThisMonth} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, billingUserId));
}
