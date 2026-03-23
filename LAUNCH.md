# Launch Checklist

Phased checklist for launching The Practice Atlas to paying customers.
**Stack:** React/Vite/Mantine (Vercel) + Hono/Bun/Drizzle/PostgreSQL (Railway)

> The frontend runs in mock mode (localStorage) by default and switches to HTTP mode when `VITE_API_URL` is set. History is intentionally client-side only — not a gap.

---

## Phase 0: Code Fixes (blockers)

These must be fixed before anything else works end-to-end.

- [ ] **Stripe customer creation** — `auth.ts:63` calls `ensureSubscription(user.id)` without a `stripeCustomerId`, so `createCheckoutSession` throws `"No Stripe customer"` at `stripe.service.ts:54`. Fix: create a Stripe customer in the Google OAuth callback and pass the ID to `ensureSubscription`.
- [ ] **Pricing CTAs** — `LandingPage.tsx:69-70` links to `/app` with "Try Demo" text. Change to link to auth/signup and use production copy (e.g., "Get Started").
- [ ] **Demo language removal** — `LandingPage.tsx:81` "Demo Available" badge, `:227` "This is a demo application. No real payments are processed.", `:241` "Try the Demo" CTA. Replace with production copy.
- [ ] **ConsentBanner commented out** — `router.tsx:9,31`. Uncomment the import and component, wire `useConsent` hook to the backend consent API.
- [ ] **SMS test button** — `Settings.tsx:82` shows `'Test SMS sent (simulated)'`. Wire to the real SMS test endpoint.

---

## Phase 1: Third-Party Account Setup

External accounts and credentials needed before deployment.

- [ ] **Google OAuth** — Create production OAuth credentials in Google Cloud Console. Set authorized redirect URI to `https://api.thepracticeatlas.com/auth/google/callback`.
- [ ] **Stripe products/prices** — Create 4 products matching tiers: Starter, Basic, Professional, Business. Record price IDs for `STRIPE_PRICE_*` env vars.
- [ ] **Stripe webhook endpoint** — Point to `https://api.thepracticeatlas.com/api/stripe/webhook`. Record signing secret for `STRIPE_WEBHOOK_SECRET`.
- [ ] **Stripe customer portal** — Configure portal with subscription management, cancellation, and invoice history.
- [ ] **Resend** — Verify sending domain (`thepracticeatlas.com`). Set up SPF, DKIM, and DMARC DNS records.
- [ ] **Twilio** — Purchase phone number. Record SID, auth token, and phone number for env vars.
- [ ] **S3** — Create bucket `practice-atlas-documents`. Configure CORS for `https://thepracticeatlas.com`. Create IAM user with scoped read/write policy.
- [ ] **Domain + DNS** — `thepracticeatlas.com` → Vercel, `api.thepracticeatlas.com` → Railway.

---

## Phase 2: Infrastructure

Deploy the backend and frontend.

### Railway (backend)
- [ ] Provision PostgreSQL database
- [ ] Deploy backend (Docker or Bun buildpack)
- [ ] Set all env vars from `server/src/env.ts` (DATABASE_URL, S3_*, GOOGLE_*, STRIPE_*, TWILIO_*, RESEND_*)
- [ ] Run database migrations
- [ ] Custom domain `api.thepracticeatlas.com` with SSL

### Vercel (frontend)
- [ ] Connect repo, set build command and output dir
- [ ] Set `VITE_API_URL=https://api.thepracticeatlas.com`
- [ ] Custom domain `thepracticeatlas.com` with SSL

### Cross-origin
- [ ] CORS: set `CORS_ORIGINS` to `https://thepracticeatlas.com` (already handled in `app.ts:33`)
- [ ] Cookies: `secure: true`, `sameSite: 'Lax'` (already set in `auth.ts:68-69` when `!env.isDev`)
- [ ] Update Google OAuth redirect URIs for production domain
- [ ] Verify `FRONTEND_URL` and `BACKEND_URL` env vars are production URLs

---

## Phase 3: Integration Work

Wire frontend to real backend services.

- [ ] **Stripe customer creation** — Implement the fix from Phase 0 (create customer in OAuth callback)
- [ ] **Billing management UI** — Show current plan, upgrade/downgrade buttons, "Manage Billing" link to Stripe portal in Settings
- [ ] **Pricing CTA wiring** — Pricing tier buttons → auth → Stripe checkout session
- [ ] **Consent hook → backend** — Wire `useConsent` to `POST /api/consent` endpoint
- [ ] **SMS test → real endpoint** — Wire Settings test button to `POST /api/notifications/test-sms`
- [ ] **Data deletion** — Cascade user deletion to: Stripe customer, S3 documents, sessions, subscriptions
- [ ] **API contract verification** — Confirm mock API response shapes match HTTP API responses (check all hooks in `src/api/`)

---

## Phase 4: Security Hardening

- [ ] **Security headers** — Add to `app.ts` middleware chain: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] **Input sanitization** — Audit email templates for HTML injection (user name/email in templates)
- [ ] **Rate limiting** — Verify rate limits on upload endpoint and Stripe webhook endpoint (already have `rateLimitMiddleware` and `authRateLimitMiddleware` in `app.ts`)
- [ ] **S3 bucket policy** — Ensure no public access; pre-signed URLs only
- [ ] **Dev code paths** — `app.ts:40-42` mounts mock OAuth routes when `env.isDev`. Verify `NODE_ENV=production` in Railway.
- [ ] **Dependency audit** — Run `bun audit` / `npm audit` on both frontend and server

---

## Phase 5: Email & SMS Polish

- [ ] **Email templates** — Replace raw HTML strings with proper templates (consider React Email or MJML in post-launch)
- [ ] **Delivery retry tuning** — Review max attempts and backoff strategy for notification delivery processor
- [ ] **SMS opt-out** — Include "Reply STOP to unsubscribe" in SMS messages per carrier compliance
- [ ] **Email deliverability** — Send test emails, check spam score, verify SPF/DKIM pass

---

## Phase 6: Testing

### Backend
- [ ] Auth flow: Google OAuth → session creation → cookie → /api/me
- [ ] Stripe webhooks: checkout.session.completed, customer.subscription.updated/deleted
- [ ] Job processors: email worker, SMS worker
- [ ] Services: document upload/download, consent storage, notification dispatch

### E2E Manual Checklist
- [ ] Signup → Google OAuth → redirect to dashboard
- [ ] Select plan → Stripe checkout → subscription active
- [ ] Upload document → S3 storage → download works
- [ ] Create obligation → deadline notification → email received
- [ ] SMS test → real message delivered
- [ ] Manage billing → Stripe portal → cancel → downgrade
- [ ] Delete account → all data removed (DB, Stripe, S3)

### Stripe-Specific
- [ ] Test card `4242 4242 4242 4242` completes checkout
- [ ] Webhook forwarding works in production
- [ ] Failed payment → subscription status updates
- [ ] Upgrade/downgrade mid-cycle prorations work

---

## Phase 7: Monitoring & Operations

- [ ] **Error tracking** — Sentry (or similar) on both frontend and backend
- [ ] **Uptime monitoring** — External health check on `https://api.thepracticeatlas.com/health`
- [ ] **Database backups** — Enable automated backups in Railway
- [ ] **Alerting** — 5xx spike alerts, health check failures, delivery failure rates

---

## Phase 8: Legal & Compliance

- [ ] **Legal page review** — Review content in PrivacyPolicy, TermsOfService, CookiePolicy components
- [ ] **GDPR compliance** — Data export endpoint works, data deletion cascades fully, consent collection functional
- [ ] **Demo language cleanup** — Final sweep: remove all "demo", "simulated", "placeholder" text from UI

---

## Phase 9: Launch Day

- [ ] Final E2E pass on production environment
- [ ] Switch Stripe from test mode to live mode (new API keys + webhook secret)
- [ ] DNS propagation verified (both domains)
- [ ] Monitor first hour: error rates, signups, payments

---

## Post-Launch Backlog

Not blocking launch, but worth tracking.

- [ ] CI/CD pipeline (GitHub Actions: lint, test, deploy)
- [ ] Server-side history (cross-device sync — currently intentionally client-side)
- [ ] Email template system (React Email / MJML)
- [ ] Browser push notifications
- [ ] WhatsApp notifications
- [ ] Annual billing option
- [ ] Free trial period
