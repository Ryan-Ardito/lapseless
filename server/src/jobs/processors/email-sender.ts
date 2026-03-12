import type { Job } from 'bullmq';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export async function processEmailSender(job: Job<EmailPayload>) {
  const { to, subject, body } = job.data;
  console.log(`[MOCK EMAIL] To: ${to}\n  Subject: ${subject}\n  Body: ${body}`);
}
