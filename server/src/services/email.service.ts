import { db } from '../db';
import { pendingEmails } from '../db/schema';
import { emailClient } from '../lib/resend';
import { triggerJob } from '../jobs/trigger';
import { renderEmail } from '../emails/render';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { SubscriptionConfirmedEmail } from '../emails/SubscriptionConfirmedEmail';
import { PlanChangedEmail } from '../emails/PlanChangedEmail';
import { SubscriptionCancelledEmail } from '../emails/SubscriptionCancelledEmail';
import { PaymentFailedEmail } from '../emails/PaymentFailedEmail';
import { ObligationReminderEmail } from '../emails/ObligationReminderEmail';
import { TestEmail } from '../emails/TestEmail';
import { InviteEmail } from '../emails/InviteEmail';

/**
 * Queue an email for reliable delivery via the background email-delivery job.
 * The email is persisted to the database before returning, so it will never be
 * silently lost even if the process crashes or Resend is temporarily down.
 */
export async function queueEmail(to: string, subject: string, html: string, text: string) {
  await db.insert(pendingEmails).values({ to, subject, html, textContent: text });
  triggerJob('email-delivery');
}

// ---------------------------------------------------------------------------
// Queued transactional emails — rendered, then persisted for background send
// ---------------------------------------------------------------------------

export async function queueWelcomeEmail(to: string, name: string) {
  const { html, text } = await renderEmail(WelcomeEmail({ name }));
  await queueEmail(to, 'Welcome to The Practice Atlas', html, text);
}

export async function queueSubscriptionConfirmedEmail(to: string, name: string, tierName: string) {
  const { html, text } = await renderEmail(SubscriptionConfirmedEmail({ name, tierName }));
  await queueEmail(to, `Your ${tierName} plan is active`, html, text);
}

export async function queuePlanChangedEmail(
  to: string,
  opts: { name: string; oldTier: string; newTier: string; direction: 'upgrade' | 'downgrade'; effectiveDate?: string },
) {
  const subject = opts.direction === 'upgrade' ? 'Plan Upgraded' : 'Plan Change Scheduled';
  const { html, text } = await renderEmail(PlanChangedEmail(opts));
  await queueEmail(to, subject, html, text);
}

export async function queueSubscriptionCancelledEmail(to: string, name: string) {
  const { html, text } = await renderEmail(SubscriptionCancelledEmail({ name }));
  await queueEmail(to, 'Your subscription has been cancelled', html, text);
}

export async function queuePaymentFailedEmail(to: string, name: string) {
  const { html, text } = await renderEmail(PaymentFailedEmail({ name }));
  await queueEmail(to, 'Your payment failed — please update your payment method', html, text);
}

export async function queueInviteEmail(
  to: string,
  opts: { inviterName: string; orgName: string; role: string; inviteToken: string },
) {
  const { html, text } = await renderEmail(InviteEmail(opts));
  await queueEmail(to, `You've been invited to join ${opts.orgName}`, html, text);
}

// ---------------------------------------------------------------------------
// Direct-send emails — used by job processors that already handle retries
// ---------------------------------------------------------------------------

export async function sendObligationReminderEmail(
  to: string,
  opts: { name: string; obligationName: string; dueDate?: string; message: string; overdue?: boolean },
) {
  const { html, text } = await renderEmail(ObligationReminderEmail(opts));
  await emailClient.sendEmail({
    to,
    subject: `${opts.overdue ? 'Overdue' : 'Reminder'}: ${opts.obligationName}`,
    text,
    html,
  });
}

export async function sendTestEmail(to: string, name: string) {
  const { html, text } = await renderEmail(TestEmail({ name }));
  await emailClient.sendEmail({
    to,
    subject: 'Test email from The Practice Atlas',
    text,
    html,
  });
}
