import { db } from '../../db';
import { pendingEmails } from '../../db/schema';
import { eq, and, lt, asc, lte, sql } from 'drizzle-orm';
import { emailClient } from '../../lib/resend';
import { logger } from '../../lib/logger';

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MINUTES = 2;

export async function processEmailDelivery() {
  const pending = await db
    .select()
    .from(pendingEmails)
    .where(
      and(
        eq(pendingEmails.status, 'pending'),
        lt(pendingEmails.attempts, MAX_ATTEMPTS),
        // Exponential backoff: only retry after 2^(attempts-1) * BASE minutes
        lte(
          sql`${pendingEmails.updatedAt} + make_interval(mins => CASE WHEN ${pendingEmails.attempts} = 0 THEN 0 ELSE ${BASE_RETRY_DELAY_MINUTES} * power(2, ${pendingEmails.attempts} - 1)::int END)`,
          sql`now()`,
        ),
      ),
    )
    .orderBy(asc(pendingEmails.createdAt))
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  for (const email of pending) {
    // Claim with optimistic locking to prevent double-send
    const [claimed] = await db
      .update(pendingEmails)
      .set({
        attempts: email.attempts + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(pendingEmails.id, email.id),
        eq(pendingEmails.attempts, email.attempts),
      ))
      .returning({ id: pendingEmails.id, attempts: pendingEmails.attempts });

    if (!claimed) continue; // Another worker already claimed this email

    try {
      await emailClient.sendEmail({
        to: email.to,
        subject: email.subject,
        text: email.textContent,
        html: email.html,
      });

      await db
        .update(pendingEmails)
        .set({ status: 'delivered', updatedAt: new Date() })
        .where(eq(pendingEmails.id, email.id));
    } catch (err) {
      await db
        .update(pendingEmails)
        .set({
          error: String(err),
          ...(claimed.attempts >= MAX_ATTEMPTS ? { status: 'failed' as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(pendingEmails.id, email.id));

      logger.error('Email delivery failed', {
        emailId: email.id,
        to: email.to,
        subject: email.subject,
        attempt: claimed.attempts,
        error: String(err),
      });
    }
  }
}
