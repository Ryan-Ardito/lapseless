import { db } from '../db';
import { subscriptions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { twilioClient } from '../lib/twilio';

export async function sendSms(userId: string, to: string, body: string) {
  await twilioClient.sendSms({ to, body });

  // Atomic increment of SMS usage
  await db
    .update(subscriptions)
    .set({
      smsUsedThisMonth: sql`${subscriptions.smsUsedThisMonth} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}
