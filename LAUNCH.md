# Launch Checklist

Phased checklist for launching The Practice Atlas (Lapseless) to paying customers.
**Stack:** React 19/Vite/Mantine (Vercel) + Hono/Bun/Drizzle/PostgreSQL (Railway)
**Integrations:** Stripe (billing), Google OAuth (auth), Twilio (SMS), Resend (email), S3 (storage)

> The frontend runs in mock mode (localStorage) by default and switches to HTTP mode when `VITE_API_URL` is set. History is intentionally client-side only — not a gap.

---

## Current State (2026-03-23)

### What's working
- Google OAuth 2.0 with PKCE flow, session management (hashed tokens, sliding window, 90-day max)
- Two-factor authentication (SMS-based OTP with timing-safe comparison)
- Obligation CRUD with soft delete, recurrence, CEU tracking
- Document upload/download via S3 presigned URLs (user-scoped paths)
- PTO tracking with yearly allowance configuration
- Checklists (end-of-month, end-of-year, custom)
- Notification scheduling (every 15 min) and delivery (every 1 min) via SMS/email
- SMS credits tracking with projected usage display
- Phone verification and 2FA setup/toggle flow
- SMS test button wired to real `POST /api/notifications/test-sms`
- Plan enforcement middleware (obligation count, storage, SMS limits per tier)
- Rate limiting (IP-based for auth endpoints, user-based for API)
- Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy)
- CORS whitelist, httpOnly/Secure/SameSite=Lax cookies
- Stripe webhook signature verification
- Input validation (Zod) on all endpoints
- Health check endpoint with database connectivity check
- Background jobs: notification scheduler, delivery, session cleanup, S3 cleanup
- Request ID tracking and structured logging
- Database migrations with retry logic

### What's NOT working / missing
- Stripe customer not created during OAuth signup (checkout will fail)
- No backend account deletion endpoint (frontend only clears localStorage)
- Pricing CTAs don't trigger Stripe checkout for selected tier
- Consent is localStorage-only (backend `consent` table unused)
- ConsentBanner commented out
- Data export/import only works with localStorage, not server data
- OAuth error redirects to `/login` which doesn't exist as a route
- Demo language still in landing page
- No SMS opt-out text in messages (carrier compliance)
- Email templates send raw HTML (potential injection from obligation names)
- No `/login` route — error redirects from OAuth hit a 404

---

## Phase 0: Code Fixes (blockers)

These must be fixed before anything else works end-to-end.

### Critical

- [ ] **Stripe customer creation** — `auth.ts:68` calls `ensureSubscription(user.id)` without a `stripeCustomerId`, so the subscription row gets `stripeCustomerId: null`. Then `createCheckoutSession` (stripe.service.ts:54) throws `"No Stripe customer"`. **Fix:** In the Google OAuth callback, call `stripe.customers.create({ email })` and pass the customer ID to `ensureSubscription`. Also backfill existing users on next login.
- [ ] **Backend account deletion** — No `DELETE /api/profile` endpoint exists. Frontend `deleteAllData()` (dataDeletion.ts) only clears localStorage/IndexedDB. **Fix:** Add a `DELETE /api/profile` route that cascades: delete Stripe customer (`stripe.customers.del`), delete S3 objects (`uploads/{userId}/*`), delete all DB records (sessions, subscriptions, obligations, documents, pto, checklists, notifications, settings, consent, otp_codes, pending_2fa_tokens, user). Wire frontend to call this endpoint in production mode.
- [ ] **OAuth error redirect** — `auth.ts:51,98` redirect to `${FRONTEND_URL}/login?error=...` but no `/login` route exists. **Fix:** Redirect to `/?error=oauth_invalid` / `/?error=oauth_failed` and show error toast on landing page, or add a `/login` route.

### Important

- [x] **Billing management UI** — Settings page shows current tier, status, period end, plan limits, and buttons for upgrade (Stripe checkout) and manage billing (Stripe portal). Implemented in `BillingSection.tsx`.
- [ ] **Pricing CTA → Stripe checkout** — When logged in, pricing buttons go to `/app/dashboard` (LandingPage.tsx:273-278). When not logged in with API configured, they go to Google auth. Neither triggers Stripe checkout for the selected tier. **Fix:** Logged-in users → `POST /api/stripe/create-checkout` with the selected tier. Not-logged-in → Google auth → redirect to checkout with tier param.
- [ ] **Demo language removal** — LandingPage.tsx:133 `"Free Demo Available"` badge, :307 `"This is a demo application. No real payments are processed."` text. Replace with production copy.
- [ ] **ConsentBanner** — `router.tsx:9,50` has ConsentBanner import and component commented out. **Fix:** Uncomment and wire the `useConsent` hook to a backend consent API endpoint.
- [ ] **Consent backend** — The `consent` table exists in the DB schema but no API routes exist. `useConsent` hook (useConsent.ts) stores consent in localStorage only. **Fix:** Add `GET/POST /api/consent` routes, sync consent state with the backend on login, fall back to localStorage for demo mode.
- [ ] **Data export for production** — `exportAllData()` (dataExport.ts) only exports localStorage keys. In production mode (HTTP API), this exports nothing useful. **Fix:** Register an HTTP export provider that fetches from `GET /api/profile/export` (new endpoint) and merges server data into the export.
- [ ] **Data import for production** — `importData()` only writes to localStorage. In production, this has no effect. **Fix:** Add `POST /api/profile/import` endpoint, or skip import in production mode with a clear message.

### Security

- [ ] **Email HTML injection** — `delivery.ts:53-54` sends `notif.message` as raw `html` in email. If obligation names or notification messages contain HTML/script tags, they render in the email. **Fix:** Escape HTML entities in notification messages before storing, or use text-only emails.
- [ ] **SMS opt-out compliance** — SMS messages (sms.service.ts, delivery.ts) don't include "Reply STOP to unsubscribe" footer. Required by US carrier compliance (TCPA/CTIA). **Fix:** Append opt-out text to all SMS messages.
- [ ] **Profile update allows phone change without reverification** — `updateProfile` (profile.service.ts:21-37) accepts `phone` in the update body. Changing phone doesn't reset `phoneVerified` or `twoFactorEnabled`. **Fix:** If phone is changed via profile update, reset `phoneVerified` to false and `twoFactorEnabled` to false, or block phone changes through profile and require the 2FA setup flow.

---

## Phase 1: Third-Party Account Setup

External accounts and credentials needed before deployment.

- [ ] **Google OAuth** — Create production OAuth credentials in Google Cloud Console. Set authorized redirect URI to `https://api.thepracticeatlas.com/auth/google/callback`. Add `https://thepracticeatlas.com` to authorized JavaScript origins.
- [ ] **Stripe products/prices** — Create 4 products matching tiers: Solo ($9/mo), Team ($29/mo), Growth ($49/mo), Scale ($99/mo). Record price IDs for `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`.
- [ ] **Stripe webhook endpoint** — Point to `https://api.thepracticeatlas.com/stripe/webhook` (note: NOT `/api/stripe/webhook` — webhook is mounted at `/stripe/webhook` per routes/index.ts:22). Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`. Record signing secret for `STRIPE_WEBHOOK_SECRET`.
- [ ] **Stripe customer portal** — Enable portal in Stripe dashboard. Configure: subscription management (upgrade/downgrade), cancellation, invoice history, payment method updates.
- [ ] **Resend** — Create account, verify sending domain (`thepracticeatlas.com`). Set up SPF, DKIM, and DMARC DNS records. Record API key for `RESEND_API_KEY`.
- [ ] **Twilio** — Purchase phone number with SMS capability. Record `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Register for A2P 10DLC messaging (required for US numbers).
- [ ] **S3** — Create bucket `practice-atlas-documents`. Configure CORS for `https://thepracticeatlas.com` and `https://api.thepracticeatlas.com`. Create IAM user with scoped read/write policy (s3:PutObject, s3:GetObject, s3:DeleteObject, s3:HeadObject). Block all public access.
- [ ] **Domain + DNS** — `thepracticeatlas.com` → Vercel, `api.thepracticeatlas.com` → Railway.

---

## Phase 2: Infrastructure

### Railway (backend)
- [ ] Provision PostgreSQL database
- [ ] Deploy backend service (Docker build or Bun buildpack)
- [ ] Set all env vars from `server/src/env.ts`:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DATABASE_URL` (Railway Postgres connection string)
  - `FRONTEND_URL=https://thepracticeatlas.com`
  - `BACKEND_URL=https://api.thepracticeatlas.com`
  - `CORS_ORIGINS=https://thepracticeatlas.com`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - `RESEND_API_KEY`, `EMAIL_FROM`
  - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- [ ] Verify database migrations run on deploy (Dockerfile CMD runs `migrate.ts` before `index.ts`)
- [ ] Custom domain `api.thepracticeatlas.com` with SSL
- [ ] Verify health check: `GET https://api.thepracticeatlas.com/health` returns `{"status":"ok"}`

### Vercel (frontend)
- [ ] Connect repo, set build command (`bun install && bun run build`) and output dir (`dist`)
- [ ] Set `VITE_API_URL=https://api.thepracticeatlas.com`
- [ ] Custom domain `thepracticeatlas.com` with SSL
- [ ] Verify SPA routing works (vercel.json rewrite to index.html)

### Cross-origin verification
- [ ] CORS: `CORS_ORIGINS=https://thepracticeatlas.com` (handled in `app.ts:33-37`)
- [ ] Cookies: `secure: true`, `sameSite: 'Lax'` (set in `auth.ts` when `!env.isDev`)
- [ ] Google OAuth redirect URI matches production domain
- [ ] Test full auth flow: landing → Google OAuth → callback → session cookie → /app/dashboard

---

## Phase 3: Security Hardening

### Already implemented
- [x] Security headers: HSTS (2yr), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, X-XSS-Protection: 0 (`app.ts:38-50`)
- [x] CORS whitelist (`app.ts:31-37`)
- [x] Rate limiting: auth (10/min, 30/hr per IP), API (100/min per user) (`middleware/rate-limit.ts`)
- [x] Session tokens hashed before storage (`auth.service.ts:13-15`)
- [x] OTP codes hashed with timing-safe comparison (`otp.service.ts`)
- [x] Parameterized queries via Drizzle ORM (no SQL injection)
- [x] Input validation with Zod on all endpoints (`lib/validators.ts`)
- [x] Stripe webhook signature verification (`stripe-webhook.ts:19`)
- [x] S3 user-scoped paths prevent cross-user access (`documents.ts:32`)
- [x] Dev-only mock OAuth gated behind `env.isDev` (`app.ts:54-56`)
- [x] OAuth PKCE + state parameter validation (`auth.ts`)
- [x] Presigned URLs with short expiration (5-15 min)

### Still needed
- [ ] **Input sanitization for emails** — Audit notification message generation for HTML injection via obligation names
- [ ] **Rate limiting on upload endpoint** — Document upload presigned URL generation has no per-endpoint rate limit beyond the general 100/min
- [ ] **S3 bucket policy** — Verify Block Public Access is enabled; no bucket policy allowing public reads
- [ ] **Dependency audit** — Run `bun audit` on root and `cd server && bun audit`
- [ ] **Profile phone change** — Ensure changing phone resets verification status (see Phase 0)
- [ ] **CSP for API responses** — Add `Content-Security-Policy: default-src 'none'` to API JSON responses to prevent accidental rendering
- [ ] **Session rotation on privilege change** — Issue new session token when enabling/disabling 2FA

---

## Phase 4: Email & SMS Polish

- [ ] **Email templates** — Replace raw HTML strings in delivery.ts with proper escaped templates. At minimum, HTML-encode obligation names and user-supplied text.
- [ ] **SMS opt-out footer** — Append "Reply STOP to unsubscribe" to all outbound SMS messages per TCPA/CTIA requirements.
- [ ] **Delivery retry tuning** — Current: max 5 attempts, no backoff delay (retried every 1-minute job cycle). Consider adding exponential backoff between attempts.
- [ ] **Email deliverability** — Send test emails from production, check spam score, verify SPF/DKIM/DMARC pass.
- [ ] **Email subject branding** — `delivery.ts:53` uses "Practice Atlas Reminder" — confirm this matches final brand name.
- [ ] **Twilio A2P 10DLC registration** — Required for US SMS sending. Register brand and campaign with Twilio.

---

## Phase 5: Testing

### Backend unit/integration tests
- [ ] Auth flow: Google OAuth → session creation → cookie → `GET /auth/me`
- [ ] Stripe: customer creation → checkout session → webhook handling (all 5 event types)
- [ ] Documents: upload URL → register → download URL → delete → S3 cleanup job
- [ ] Notifications: scheduler creates pending → delivery sends → status updates
- [ ] Plan enforcement: obligation/storage/SMS limits reject at boundary
- [ ] 2FA: setup → verify phone → enable → login challenge → verify OTP
- [ ] Account deletion: cascades through all tables + Stripe + S3

### E2E Manual Checklist
- [ ] **Signup flow:** Landing → Google OAuth → redirect to dashboard (new user created, subscription row created with Stripe customer)
- [ ] **Checkout flow:** Settings → select plan → Stripe checkout → webhook → subscription active → tier updated
- [ ] **Document upload:** Upload file → stored in S3 → download link works → delete → S3 cleanup
- [ ] **Notification flow:** Create obligation with SMS channel → wait for scheduler → SMS delivered to phone
- [ ] **Email notification:** Create obligation with email channel → scheduler → email arrives
- [ ] **SMS test:** Settings → Send Test SMS → real message arrives on phone
- [ ] **2FA flow:** Settings → add phone → verify → enable 2FA → log out → log in → enter OTP code → access granted
- [ ] **Billing management:** Settings → Manage Billing → Stripe portal → change plan/cancel → webhook updates subscription
- [ ] **Account deletion:** Settings → Delete All Data → all DB records removed, Stripe customer deleted, S3 files deleted, session cleared, redirect to landing
- [ ] **Plan limits:** Create obligations up to tier limit → next creation blocked with 403
- [ ] **PTO:** Create entries, set yearly allowance, verify hours calculation
- [ ] **Checklists:** Create, complete items, mark checklist complete
- [ ] **Demo mode:** Visit `/demo/*` routes without auth — all features work with localStorage

### Stripe-specific
- [ ] Test card `4242 4242 4242 4242` completes checkout
- [ ] Webhook forwarding works in production (`/stripe/webhook` not `/api/stripe/webhook`)
- [ ] Failed payment (test card `4000 0000 0000 0341`) → `invoice.payment_failed` webhook → status `past_due`
- [ ] Upgrade mid-cycle → prorations applied correctly
- [ ] Cancel → `cancelAtPeriodEnd: true` → access continues until period end → then downgrade to solo
- [ ] Reactivate from Stripe portal before period end → cancel flag removed

---

## Phase 6: Legal & Compliance

- [ ] **Legal page review** — Review content in PrivacyPolicy, TermsOfService, CookiePolicy components for accuracy
- [ ] **GDPR compliance:**
  - Data export endpoint works (new — needs building in Phase 0)
  - Account deletion cascades fully (new — needs building in Phase 0)
  - Consent collection functional (ConsentBanner uncommented, backend sync)
  - Right to access (profile endpoint returns user data)
- [ ] **Demo language cleanup** — Final sweep: search codebase for "demo", "simulated", "placeholder", "mock" in user-facing text
- [ ] **SMS compliance** — TCPA/CTIA opt-out text in all SMS, A2P 10DLC registration, consent before sending
- [ ] **Cookie consent** — ConsentBanner must be shown before setting non-essential cookies/storage
- [ ] **Copyright/branding** — Footer shows "Data Locality LLC" — confirm this is the operating entity

---

## Phase 7: Monitoring & Operations

- [ ] **Error tracking** — Add Sentry (or similar) to both frontend and backend for crash reporting
- [ ] **Uptime monitoring** — External health check polling `https://api.thepracticeatlas.com/health`
- [ ] **Database backups** — Enable automated backups in Railway
- [ ] **Alerting** — Set up alerts for: 5xx error rate spike, health check failures, notification delivery failure rate, Stripe webhook failures
- [ ] **Log aggregation** — Backend outputs structured JSON logs (logger.ts). Pipe to Railway logs or external service.
- [ ] **Rate limit monitoring** — In-memory rate limiter resets on server restart (acceptable for single-instance). Monitor for need to move to Redis if scaling.

---

## Phase 8: Launch Day

- [ ] Final E2E pass on production environment
- [ ] Switch Stripe from test mode to live mode (new API keys + webhook secret + price IDs)
- [ ] DNS propagation verified (both domains resolve correctly)
- [ ] SSL certificates valid on both domains
- [ ] All env vars set with production values (no test/dev values remaining)
- [ ] `NODE_ENV=production` confirmed on Railway
- [ ] Monitor first hour: error rates, signup count, payment success rate, delivery rates
- [ ] Verify no dev-only routes are accessible (`/auth/dev/*` should not mount in production)

---

## Post-Launch Backlog

Not blocking launch, but worth tracking.

- [ ] CI/CD pipeline (GitHub Actions: lint, test, build, deploy)
- [ ] Server-side history (cross-device sync — currently intentionally client-side)
- [ ] Email template system (React Email / MJML for better formatting)
- [ ] Browser push notifications (Web Push API)
- [ ] WhatsApp notifications (currently `skipped` in scheduler)
- [ ] Annual billing option
- [ ] Free trial period (Stripe `trial_period_days`)
- [ ] 2FA backup codes (recovery when phone unavailable)
- [ ] TOTP support (authenticator app as alternative to SMS)
- [ ] Audit logging for sensitive operations (2FA changes, phone changes, account deletion)
- [ ] Multi-user workspace support (team/growth/scale tiers have `users > 1` but no multi-user logic exists)
- [ ] Subscription reconciliation job (periodic sync with Stripe API to catch missed webhooks)
