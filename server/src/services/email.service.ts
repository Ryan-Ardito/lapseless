import { emailClient } from '../lib/resend';
import { renderEmail } from '../emails/render';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { SubscriptionConfirmedEmail } from '../emails/SubscriptionConfirmedEmail';
import { PlanChangedEmail } from '../emails/PlanChangedEmail';
import { SubscriptionCancelledEmail } from '../emails/SubscriptionCancelledEmail';
import { ObligationReminderEmail } from '../emails/ObligationReminderEmail';
import { TestEmail } from '../emails/TestEmail';

export async function sendWelcomeEmail(to: string, name: string) {
  const { html, text } = await renderEmail(WelcomeEmail({ name }));
  await emailClient.sendEmail({
    to,
    subject: 'Welcome to The Practice Atlas',
    text,
    html,
  });
}

export async function sendSubscriptionConfirmedEmail(to: string, name: string, tierName: string) {
  const { html, text } = await renderEmail(SubscriptionConfirmedEmail({ name, tierName }));
  await emailClient.sendEmail({
    to,
    subject: `Your ${tierName} plan is active`,
    text,
    html,
  });
}

export async function sendPlanChangedEmail(
  to: string,
  opts: { name: string; oldTier: string; newTier: string; direction: 'upgrade' | 'downgrade'; effectiveDate?: string },
) {
  const subject = opts.direction === 'upgrade' ? 'Plan Upgraded' : 'Plan Change Scheduled';
  const { html, text } = await renderEmail(PlanChangedEmail(opts));
  await emailClient.sendEmail({ to, subject, text, html });
}

export async function sendSubscriptionCancelledEmail(to: string, name: string) {
  const { html, text } = await renderEmail(SubscriptionCancelledEmail({ name }));
  await emailClient.sendEmail({
    to,
    subject: 'Your subscription has been cancelled',
    text,
    html,
  });
}

export async function sendObligationReminderEmail(
  to: string,
  opts: { name: string; obligationName: string; dueDate?: string; message: string },
) {
  const { html, text } = await renderEmail(ObligationReminderEmail(opts));
  await emailClient.sendEmail({
    to,
    subject: `Reminder: ${opts.obligationName}`,
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
