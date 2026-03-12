import type { Job } from 'bullmq';
import { sendSms } from '../../services/sms.service';

interface SmsPayload {
  userId: string;
  phone: string;
  message: string;
  obligationId: string;
}

export async function processSmsSender(job: Job<SmsPayload>) {
  const { userId, phone, message } = job.data;
  await sendSms(userId, phone, message);
}
