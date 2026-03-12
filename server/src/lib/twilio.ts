import { env } from '../env';

interface SmsParams {
  to: string;
  body: string;
}

interface TwilioLike {
  sendSms(params: SmsParams): Promise<void>;
}

class RealTwilioClient implements TwilioLike {
  private client: any;

  constructor() {
    // Dynamic import avoids crash when credentials are missing in dev
    const Twilio = require('twilio');
    this.client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  async sendSms({ to, body }: SmsParams) {
    await this.client.messages.create({
      to,
      from: env.TWILIO_PHONE_NUMBER,
      body,
    });
  }
}

class MockTwilioClient implements TwilioLike {
  async sendSms({ to, body }: SmsParams) {
    console.log(`[MOCK SMS] To: ${to}\n  Body: ${body}`);
  }
}

export const twilioClient: TwilioLike = env.isDev
  ? new MockTwilioClient()
  : new RealTwilioClient();
