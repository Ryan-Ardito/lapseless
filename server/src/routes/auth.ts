import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { google } from '../lib/arctic';
import { generateCodeVerifier, generateState } from 'arctic';
import { upsertUserFromGoogle, createSession, deleteSession } from '../services/auth.service';
import { createOtp, createPending2faToken } from '../services/otp.service';
import { sendSms } from '../services/sms.service';
import { ensureSubscription, getSubscription, createOrGetStripeCustomer } from '../services/stripe.service';
import { env } from '../env';
import { authMiddleware } from '../middleware/auth';
import { checkSmsLimit } from '../middleware/plan-enforcement';

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

  if (!code || !state || state !== storedState || !codeVerifier) {
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
    const stripeCustomerId = await createOrGetStripeCustomer(user.id, profile.email, profile.name);
    const sub = await ensureSubscription(user.id, stripeCustomerId ?? undefined);
    const defaultRedirect = sub.tier === 'demo' ? '/demo/dashboard' : '/app/dashboard';

    if (user.twoFactorEnabled && user.phoneVerified) {
      const token = await createPending2faToken(user.id);
      try {
        await checkSmsLimit(user.id);
        const code = await createOtp(user.id, '2fa_login');
        await sendSms(user.id, user.phone, `Your Practice Atlas verification code is: ${code}`, { transactional: true });
      } catch {
        // SMS quota exceeded or send failure — user can resend from verify page
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
    const safePath = redirectPath.startsWith('/') && !redirectPath.includes('//')
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
  } catch {
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
  const sub = await getSubscription(user.id);
  return c.json({ ...user, tier: sub?.tier ?? 'demo' });
});

export default app;
