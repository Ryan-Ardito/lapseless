import { db } from '../db';
import { otpCodes, pending2faTokens } from '../db/schema';
import { eq, and, gt, gte, desc } from 'drizzle-orm';
import { hashSessionToken } from './auth.service';

export function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1000000).padStart(6, '0');
}

export async function createOtp(userId: string, type: 'phone_verification' | '2fa_login'): Promise<string> {
  // Rate limit: max 5 OTPs per user per 15 min
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recent = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(
      eq(otpCodes.userId, userId),
      eq(otpCodes.type, type),
      gte(otpCodes.createdAt, fifteenMinAgo),
    ));

  if (recent.length >= 5) {
    throw new Error('Too many OTP requests. Please wait before trying again.');
  }

  // Invalidate previous unused OTPs for same user+type
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(
      eq(otpCodes.userId, userId),
      eq(otpCodes.type, type),
      eq(otpCodes.used, false),
    ));

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await db.insert(otpCodes).values({
    userId,
    code,
    type,
    expiresAt,
  });

  return code;
}

export async function verifyOtp(
  userId: string,
  code: string,
  type: 'phone_verification' | '2fa_login',
): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select()
    .from(otpCodes)
    .where(and(
      eq(otpCodes.userId, userId),
      eq(otpCodes.type, type),
      eq(otpCodes.used, false),
      gt(otpCodes.expiresAt, now),
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (rows.length === 0) return false;

  const otp = rows[0];

  if (otp.attempts >= 5) return false;

  if (otp.code !== code) {
    await db
      .update(otpCodes)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(otpCodes.id, otp.id));
    return false;
  }

  await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, otp.id));

  return true;
}

export async function createPending2faToken(userId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawToken = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashedToken = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await db.insert(pending2faTokens).values({
    id: hashedToken,
    userId,
    expiresAt,
  });

  return rawToken;
}

export async function validatePending2faToken(rawToken: string): Promise<string | null> {
  const hashedToken = hashSessionToken(rawToken);
  const now = new Date();

  const rows = await db
    .select()
    .from(pending2faTokens)
    .where(and(
      eq(pending2faTokens.id, hashedToken),
      gt(pending2faTokens.expiresAt, now),
    ))
    .limit(1);

  if (rows.length === 0) return null;

  // One-shot: delete after use
  await db.delete(pending2faTokens).where(eq(pending2faTokens.id, hashedToken));

  return rows[0].userId;
}

/** Peek at a pending 2FA token without consuming it */
export async function peekPending2faToken(rawToken: string): Promise<string | null> {
  const hashedToken = hashSessionToken(rawToken);
  const now = new Date();

  const rows = await db
    .select({ userId: pending2faTokens.userId })
    .from(pending2faTokens)
    .where(and(
      eq(pending2faTokens.id, hashedToken),
      gt(pending2faTokens.expiresAt, now),
    ))
    .limit(1);

  return rows[0]?.userId ?? null;
}
