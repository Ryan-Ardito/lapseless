import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { google } from '../lib/arctic';
import { generateCodeVerifier, generateState } from 'arctic';
import { upsertUserFromGoogle, createSession, deleteSession } from '../services/auth.service';
import { ensureSubscription } from '../services/stripe.service';
import { env } from '../env';
import { authMiddleware } from '../middleware/auth';

const app = new Hono();

app.get('/google', async (c) => {
  if (env.isDev) {
    return c.redirect('/auth/dev/google');
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const scopes = ['openid', 'profile', 'email'];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);

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

  return c.redirect(url.toString());
});

app.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'oauth_state');
  const codeVerifier = getCookie(c, 'oauth_code_verifier');

  if (!code || !state || state !== storedState || !codeVerifier) {
    deleteCookie(c, 'oauth_state');
    deleteCookie(c, 'oauth_code_verifier');
    return c.redirect(`${env.FRONTEND_URL}/login?error=oauth_invalid`);
  }

  deleteCookie(c, 'oauth_state');
  deleteCookie(c, 'oauth_code_verifier');

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const profile = await res.json() as { sub: string; email: string; name: string; picture?: string };

    const user = await upsertUserFromGoogle(profile);
    await ensureSubscription(user.id);
    const session = await createSession(user.id);

    setCookie(c, 'session', session.token, {
      httpOnly: true,
      secure: !env.isDev,
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.redirect(`${env.FRONTEND_URL}/app/dashboard`);
  } catch {
    return c.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

app.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session');
  if (sessionId) {
    await deleteSession(sessionId);
  }
  deleteCookie(c, 'session');
  return c.json({ ok: true });
});

app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json(user);
});

export default app;
