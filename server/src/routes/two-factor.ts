import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../env';
import { createSession, deleteOtherSessions } from '../services/auth.service';
import {
  createOtp,
  verifyOtp,
  validatePending2faToken,
  peekPending2faToken,
} from '../services/otp.service';
import { sendSms } from '../services/sms.service';
import { checkSmsLimit } from '../middleware/plan-enforcement';
import { phoneE164Schema, otpCodeSchema } from '../lib/validators';
import { authMiddleware } from '../middleware/auth';

// --- Public 2FA challenge routes (mounted at /auth/2fa) ---
export const twoFactorChallenge = new Hono();

twoFactorChallenge.post('/verify', async (c) => {
  const pending2fa = getCookie(c, 'pending_2fa');
  if (!pending2fa) {
    return c.json({ error: 'No pending 2FA challenge' }, 401);
  }

  const body = await c.req.json();
  const parsed = otpCodeSchema.safeParse(body.code);
  if (!parsed.success) {
    return c.json({ error: 'Invalid code format' }, 400);
  }

  const userId = await peekPending2faToken(pending2fa);
  if (!userId) {
    deleteCookie(c, 'pending_2fa', { path: '/' });
    return c.json({ error: 'Challenge expired. Please log in again.' }, 401);
  }

  const valid = await verifyOtp(userId, parsed.data, '2fa_login');
  if (!valid) {
    return c.json({ error: 'Invalid or expired code' }, 400);
  }

  // Consume the pending token only after OTP succeeds
  await validatePending2faToken(pending2fa);

  // Create full session
  const session = await createSession(userId);
  setCookie(c, 'session', session.token, {
    httpOnly: true,
    secure: !env.isDev,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  deleteCookie(c, 'pending_2fa', { path: '/' });

  return c.json({ redirect: `${env.FRONTEND_URL}/app/dashboard` });
});

twoFactorChallenge.post('/resend', async (c) => {
  const pending2fa = getCookie(c, 'pending_2fa');
  if (!pending2fa) {
    return c.json({ error: 'No pending 2FA challenge' }, 401);
  }

  const userId = await peekPending2faToken(pending2fa);
  if (!userId) {
    return c.json({ error: 'Challenge expired. Please log in again.' }, 401);
  }

  // Look up user phone
  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.phone) {
    return c.json({ error: 'No phone number on file' }, 400);
  }

  try {
    const code = await createOtp(userId, '2fa_login');
    await sendSms(userId, user.phone, `Your Lapseless verification code is: ${code}`);
    return c.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes('Too many OTP')) {
      return c.json({ error: 'Please wait before trying again.' }, 429);
    }
    throw err;
  }
});

// --- Protected 2FA setup routes (mounted at /api/2fa) ---
export const twoFactorSetup = new Hono();

twoFactorSetup.post('/setup/send-code', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = phoneE164Schema.safeParse(body.phone);
  if (!parsed.success) {
    return c.json({ error: 'Invalid phone number. Use E.164 format (e.g. +15551234567)' }, 400);
  }

  try {
    await checkSmsLimit(user.id);
    const code = await createOtp(user.id, 'phone_verification');
    await sendSms(user.id, parsed.data, `Your Lapseless verification code is: ${code}`);
    return c.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes('Too many OTP')) {
      return c.json({ error: 'Please wait before trying again.' }, 429);
    }
    throw err;
  }
});

twoFactorSetup.post('/setup/verify-phone', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const codeParsed = otpCodeSchema.safeParse(body.code);
  if (!codeParsed.success) {
    return c.json({ error: 'Invalid code format' }, 400);
  }

  const phoneParsed = phoneE164Schema.safeParse(body.phone);
  if (!phoneParsed.success) {
    return c.json({ error: 'Invalid phone number' }, 400);
  }

  const valid = await verifyOtp(user.id, codeParsed.data, 'phone_verification');
  if (!valid) {
    return c.json({ error: 'Invalid or expired code' }, 400);
  }

  await db
    .update(users)
    .set({
      phone: phoneParsed.data,
      phoneVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return c.json({ ok: true });
});

twoFactorSetup.post('/toggle', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const enabled = !!body.enabled;

  if (enabled && !user.phoneVerified) {
    return c.json({ error: 'Phone must be verified before enabling two-factor authentication' }, 400);
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const sessionToken = getCookie(c, 'session');
  if (sessionToken) await deleteOtherSessions(user.id, sessionToken);

  return c.json({ ok: true, twoFactorEnabled: enabled });
});

twoFactorSetup.post('/remove-phone', async (c) => {
  const user = c.get('user');
  await db
    .update(users)
    .set({
      phone: '',
      phoneVerified: false,
      twoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const sessionToken = getCookie(c, 'session');
  if (sessionToken) await deleteOtherSessions(user.id, sessionToken);

  return c.json({ ok: true });
});

twoFactorSetup.post('/disable', async (c) => {
  const user = c.get('user');
  await db
    .update(users)
    .set({ twoFactorEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const sessionToken = getCookie(c, 'session');
  if (sessionToken) await deleteOtherSessions(user.id, sessionToken);

  return c.json({ ok: true });
});

twoFactorSetup.get('/status', async (c) => {
  const user = c.get('user');
  const maskedPhone = user.phone
    ? user.phone.slice(0, -4).replace(/./g, '*') + user.phone.slice(-4)
    : null;
  return c.json({
    twoFactorEnabled: user.twoFactorEnabled,
    phoneVerified: user.phoneVerified,
    phone: maskedPhone,
  });
});
