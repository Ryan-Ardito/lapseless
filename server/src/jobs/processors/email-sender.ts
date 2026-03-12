import type { Job } from 'bullmq';
import { emailClient } from '../../lib/resend';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export async function processEmailSender(job: Job<EmailPayload>) {
  const { to, subject, body } = job.data;
  await emailClient.sendEmail({ to, subject, html: body });
}
