import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { google } from '../lib/arctic';
import { generateCodeVerifier, generateState } from 'arctic';
import { timingSafeEqual } from 'crypto';
import { upsertUserFromGoogle, createSession, deleteSession } from '../services/auth.service';
import { createOtp, createPending2faToken } from '../services/otp.service';
import { sendSms } from '../services/sms.service';
import { ensureSubscription, getSubscription, createOrGetStripeCustomer } from '../services/stripe.service';
import { queueWelcomeEmail } from '../services/email.service';
import { listUserOrgs } from '../services/org.service';
import { countPendingInvitesForUser } from '../services/org-invite.service';
import { env } from '../env';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';

const app = new Hono();

app.get('/google', async (c) => {
  if (env.isDev) {
    return c.redirect('/auth/dev/google');
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const scopes = ['openid', 'profile', 'email'];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);
  url.searchParams.set('prompt', 'select_account');

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: !env.isDev,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });
  setCookie(c, 'oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: !env.isDev,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });

  const redirectTo = c.req.query('redirect');
  if (redirectTo) {
    setCookie(c, 'oauth_redirect', redirectTo, {
      httpOnly: true,
      secure: !env.isDev,
      sameSite: 'Lax',
      path: '/',
      maxAge: 600,
    });
  }

  return c.redirect(url.toString());
});

app.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'oauth_state');
  const codeVerifier = getCookie(c, 'oauth_code_verifier');

  if (!code || !state || !storedState || !codeVerifier
      || !timingSafeEqual(Buffer.from(state), Buffer.from(storedState))) {
    deleteCookie(c, 'oauth_state', { path: '/' });
    deleteCookie(c, 'oauth_code_verifier', { path: '/' });
    return c.redirect(`${env.FRONTEND_URL}/?error=oauth_invalid`);
  }

  deleteCookie(c, 'oauth_state', { path: '/' });
  deleteCookie(c, 'oauth_code_verifier', { path: '/' });

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const profile = await res.json() as { sub: string; email: string; name: string; picture?: string };

    const user = await upsertUserFromGoogle(profile);
    if (user.isNewUser) {
      await queueWelcomeEmail(profile.email, profile.name);
    }
    const stripeCustomerId = await createOrGetStripeCustomer(user.id, profile.email, profile.name);
    const sub = await ensureSubscription(user.id, stripeCustomerId ?? undefined);

    // Determine default redirect based on orgs
    const [userOrgs, pendingInvites] = await Promise.all([
      listUserOrgs(user.id),
      countPendingInvitesForUser(profile.email),
    ]);
    let defaultRedirect: string;
    if (userOrgs.length > 0) {
      defaultRedirect = `/app/orgs/${userOrgs[0].id}/dashboard`;
    } else if (sub.tier === 'demo' && pendingInvites === 0) {
      defaultRedirect = '/demo/dashboard';
    } else {
      defaultRedirect = '/app/orgs'; // org management page to accept invites or create org
    }

    if (user.twoFactorEnabled && user.phoneVerified) {
      const token = await createPending2faToken(user.id);
      try {
        const code = await createOtp(user.id, '2fa_login');
        // 2FA is user-level security — bill to user's own subscription, not any org owner
        await sendSms(user.id, user.phone, `Your Practice Atlas verification code is: ${code}`, { transactional: true });
      } catch (err) {
        logger.warn('2FA SMS send failed during login', { userId: user.id, error: String(err) });
      }

      setCookie(c, 'pending_2fa', token, {
        httpOnly: true,
        secure: !env.isDev,
        sameSite: 'Lax',
        path: '/',
        maxAge: 5 * 60,
      });

      return c.redirect(`${env.FRONTEND_URL}/auth/verify`);
    }

    const redirectPath = getCookie(c, 'oauth_redirect') || defaultRedirect;
    deleteCookie(c, 'oauth_redirect', { path: '/' });
    const safePath = /^\/[a-zA-Z0-9/_\-?&=.%]+$/.test(redirectPath)
      ? redirectPath : defaultRedirect;

    const session = await createSession(user.id);

    setCookie(c, 'session', session.token, {
      httpOnly: true,
      secure: !env.isDev,
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.redirect(`${env.FRONTEND_URL}${safePath}`);
  } catch (err) {
    logger.error('OAuth callback failed', { error: String(err) });
    return c.redirect(`${env.FRONTEND_URL}/?error=oauth_failed`);
  }
});

app.post('/logout', authMiddleware, async (c) => {
  const sessionId = getCookie(c, 'session');
  if (sessionId) {
    await deleteSession(sessionId);
  }
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ ok: true });
});

app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const [sub, orgs, pendingInviteCount] = await Promise.all([
    getSubscription(user.id),
    listUserOrgs(user.id),
    countPendingInvitesForUser(user.email),
  ]);
  return c.json({
    ...user,
    tier: sub?.tier ?? 'demo',
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, role: o.role })),
    pendingInviteCount,
  });
});

export default app;
