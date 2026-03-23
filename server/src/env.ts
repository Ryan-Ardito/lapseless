import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    CORS_ORIGINS: z.string().default(''),
    BACKEND_URL: z.string().default('http://localhost:3000'),

    DATABASE_URL: z.string(),

    S3_ENDPOINT: z.string().default(''),
    S3_PUBLIC_ENDPOINT: z.string().default(''),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('practice-atlas-documents'),
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
    EMAIL_FROM: z.string().default('The Practice Atlas <noreply@thepracticeatlas.com>'),
  })
  .transform((val) => ({
    ...val,
    isDev: val.NODE_ENV === 'development',
    isProd: val.NODE_ENV === 'production',
  }))
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      const required: { key: keyof typeof val; label: string }[] = [
        { key: 'GOOGLE_CLIENT_ID', label: 'GOOGLE_CLIENT_ID' },
        { key: 'GOOGLE_CLIENT_SECRET', label: 'GOOGLE_CLIENT_SECRET' },
        { key: 'STRIPE_SECRET_KEY', label: 'STRIPE_SECRET_KEY' },
        { key: 'STRIPE_WEBHOOK_SECRET', label: 'STRIPE_WEBHOOK_SECRET' },
        { key: 'TWILIO_ACCOUNT_SID', label: 'TWILIO_ACCOUNT_SID' },
        { key: 'TWILIO_AUTH_TOKEN', label: 'TWILIO_AUTH_TOKEN' },
        { key: 'TWILIO_PHONE_NUMBER', label: 'TWILIO_PHONE_NUMBER' },
      ];
      for (const { key, label } of required) {
        if (!val[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} is required in production`,
            path: [label],
          });
        }
      }
    }
  });

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
