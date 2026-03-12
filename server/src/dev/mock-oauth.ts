import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { upsertUserFromGoogle, createSession } from '../services/auth.service';
import { ensureSubscription } from '../services/stripe.service';
import { env } from '../env';

const app = new Hono();

const DEV_USER = {
  sub: 'dev-google-id-12345',
  email: 'dev@lapseless.local',
  name: 'Dev User',
  picture: undefined,
};

app.get('/google', (c) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Dev OAuth</title></head>
    <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
      <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;">
        <h2>Dev OAuth Login</h2>
        <p>Sign in as: <strong>${DEV_USER.name}</strong> (${DEV_USER.email})</p>
        <a href="/auth/dev/google/callback" style="display: inline-block; padding: 12px 24px; background: #4285f4; color: white; text-decoration: none; border-radius: 4px; font-size: 16px;">
          Sign in as Dev User
        </a>
      </div>
    </body>
    </html>
  `;
  return c.html(html);
});

app.get('/google/callback', async (c) => {
  const user = await upsertUserFromGoogle(DEV_USER);
  await ensureSubscription(user.id);
  const session = await createSession(user.id);

  setCookie(c, 'session', session.token, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.redirect(`${env.FRONTEND_URL}/app/dashboard`);
});

export default app;
