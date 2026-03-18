import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    CORS_ORIGINS: z.string().default(''),
    BACKEND_URL: z.string().default('http://localhost:3000'),

    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),

    S3_ENDPOINT: z.string().default(''),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('lapseless-documents'),
    S3_ACCESS_KEY_ID: z.string().default(''),
    S3_SECRET_ACCESS_KEY: z.string().default(''),

    SERVE_STATIC: z
      .enum(['true', 'false', '1', '0', ''])
      .default('false')
      .transform((v) => v === 'true' || v === '1'),

    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),

    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),
    STRIPE_PRICE_SOLO: z.string().default(''),
    STRIPE_PRICE_TEAM: z.string().default(''),
    STRIPE_PRICE_GROWTH: z.string().default(''),
    STRIPE_PRICE_SCALE: z.string().default(''),

    TWILIO_ACCOUNT_SID: z.string().default(''),
    TWILIO_AUTH_TOKEN: z.string().default(''),
    TWILIO_PHONE_NUMBER: z.string().default(''),

    RESEND_API_KEY: z.string().default(''),
    EMAIL_FROM: z.string().default('Lapseless <noreply@lapseless.com>'),
  })
  .transform((val) => ({
    ...val,
    isDev: val.NODE_ENV === 'development',
    isProd: val.NODE_ENV === 'production',
  }));

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
