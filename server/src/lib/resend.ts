import { env } from '../env';
import { logger } from './logger';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface EmailClient {
  sendEmail(params: SendEmailParams): Promise<void>;
}

class RealResendClient implements EmailClient {
  async sendEmail({ to, subject, html }: SendEmailParams) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error (${res.status}): ${body}`);
    }
  }
}

class MockEmailClient implements EmailClient {
  async sendEmail({ to, subject, html }: SendEmailParams) {
    logger.info('[MOCK EMAIL]', { to, subject, html });
  }
}

export const emailClient: EmailClient = env.isDev
  ? new MockEmailClient()
  : new RealResendClient();
