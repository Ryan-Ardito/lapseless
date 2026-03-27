# Launch Checklist

Phased checklist for launching The Practice Atlas (Lapseless) to paying customers.
**Stack:** React 19/Vite/Mantine (Vercel) + Hono/Bun/Drizzle/PostgreSQL (Railway)
**Integrations:** Stripe (billing), Google OAuth (auth), Twilio (SMS), Resend (email), S3 (storage)

> The frontend runs in mock mode (localStorage) by default and switches to HTTP mode when `VITE_API_URL` is set. History is intentionally client-side only — not a gap.

---

## Current State (2026-03-26)

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
- Background jobs: notification scheduler, delivery, session cleanup, S3 cleanup, rate-limit pruning
- Request ID tracking and structured logging
- Database migrations with retry logic
- OAuth error redirects to `/?error=...` with toast display on landing page (no more `/login` 404)
- Consent backend API (`GET/PUT/DELETE /api/settings/consent`) stores consent per user in DB
- React Email templates (Welcome, SubscriptionConfirmed, PlanChanged, SubscriptionCancelled, ObligationReminder, Test) with shared layout and styles
- Session rotation on 2FA privilege changes (toggle, remove-phone, disable all invalidate other sessions)
- Pricing CTAs trigger Stripe checkout for selected tier (logged-in demo users → direct checkout, not-logged-in → OAuth → checkout)
- Production data export via `GET /api/profile/export` (all user data aggregated, s3Keys stripped)
- Delivery retry with exponential backoff (2/4/8/16 min delays between attempts)
- Welcome email directs new users to pricing page (`/#pricing`)
- Backend unit tests (plan-limits, validators, date-math, error-handler, obligations, checklists, pto)

### What's NOT working / missing
- ConsentBanner still commented out in router.tsx (backend consent API exists but frontend doesn't use it)
- No error tracking (Sentry or similar)
- No CI/CD pipeline
- No external uptime monitoring

---

## Phase 0: Code Fixes (blockers)

These must be fixed before anything else works end-to-end.

### Critical

- [x] **Stripe customer creation** — `auth.ts:80` calls `ensureSubscription(user.id)` without a `stripeCustomerId`, so the subscription row gets `stripeCustomerId: null`. Then `createCheckoutSession` throws `"No Stripe customer"`. **Fix:** In the Google OAuth callback, call `stripe.customers.create({ email })` and pass the customer ID to `ensureSubscription`. Also backfill existing users on next login.
- [x] **Backend account deletion** — No `DELETE /api/profile` endpoint exists. Frontend `deleteAllData()` (dataDeletion.ts) only clears localStorage/IndexedDB. **Fix:** Add a `DELETE /api/profile` route that cascades: delete Stripe customer (`stripe.customers.del`), delete S3 objects (`uploads/{userId}/*`), delete all DB records (sessions, subscriptions, obligations, documents, pto, checklists, notifications, settings, consent, otp_codes, pending_2fa_tokens, user). Wire frontend to call this endpoint in production mode.
- [x] **OAuth error redirect** — Now redirects to `/?error=oauth_invalid` / `/?error=oauth_failed`. LandingPage.tsx reads query params and displays error toasts.

### Important

- [x] **Billing management UI** — Settings page shows current tier, status, period end, plan limits, and buttons for upgrade (Stripe checkout) and manage billing (Stripe portal). Implemented in `BillingSection.tsx`.
- [x] **Pricing CTA → Stripe checkout** — Landing page pricing buttons now trigger Stripe checkout directly for logged-in demo users, and pass the tier through OAuth redirect for not-logged-in users (`/app/settings?checkout=<tier>` → router beforeLoad triggers checkout). Paid-tier users see "Go to Dashboard".
- [x] **Demo language removal** — Removed "Free Demo Available" badge, "This is a demo application" disclaimer, and changed "Try Demo" buttons to "Try Free".
- [ ] **ConsentBanner** — `router.tsx:9,50` has ConsentBanner import and component commented out. Backend consent API now exists at `GET/PUT/DELETE /api/settings/consent`. **Fix:** Uncomment ConsentBanner and wire the `useConsent` hook to the backend consent API.
- [x] **Consent backend** — Consent CRUD routes implemented in `settings.ts:28-91` (`GET/PUT/DELETE /api/settings/consent`). Stores per-user consent with version, categories (essential, documentStorage, notificationData, analytics), and timestamps.
- [x] **Data export for production** — `GET /api/profile/export` aggregates all user data (profile, obligations, documents metadata, PTO, checklists, notifications, settings, consent). Frontend `exportAllData()` detects production mode and fetches from server. S3 keys stripped from document records.
- [x] **Data import for production** — Import button hidden in production mode (only relevant for demo/localStorage). Help text updated accordingly.

### Security

- [x] **Email HTML injection** — `delivery.ts:51-54` sends notifications using `text` field only (not `html`). Obligation names appear only in the subject line. No HTML injection risk.
- [x] **SMS opt-out compliance** — `sendSms` appends "Reply STOP to unsubscribe" to all non-transactional SMS. OTP messages marked as `{ transactional: true }` to exclude the footer.
- [x] **Profile update resets phone verification** — `updateProfile` now detects phone changes and resets `phoneVerified` and `twoFactorEnabled` to false when the phone number differs.

---

## Phase 1: Third-Party Account Setup

External accounts and credentials needed before deployment.

- [x] **Google OAuth** — Create production OAuth credentials in Google Cloud Console. Set authorized redirect URI to `https://api.thepracticeatlas.com/auth/google/callback`. Add `https://thepracticeatlas.com` to authorized JavaScript origins.
- [x] **Stripe products/prices** — Create 4 products matching tiers: Solo ($9/mo), Team ($29/mo), Growth ($49/mo), Scale ($99/mo). Record price IDs for `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`.
- [x] **Stripe webhook endpoint** — Point to `https://api.thepracticeatlas.com/stripe/webhook` (note: NOT `/api/stripe/webhook` — webhook is mounted at `/stripe/webhook` per routes/index.ts:22). Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`. Record signing secret for `STRIPE_WEBHOOK_SECRET`.
- [x] **Stripe customer portal** — Enable portal in Stripe dashboard. Configure: subscription management (upgrade/downgrade), cancellation, invoice history, payment method updates.
- [x] **Resend** — Create account, verify sending domain (`thepracticeatlas.com`). Set up SPF, DKIM, and DMARC DNS records. Record API key for `RESEND_API_KEY`.
- [x] **Twilio** — Purchase phone number with SMS capability. Record `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Register for A2P 10DLC messaging (required for US numbers).
- [x] **S3** — Create bucket `practice-atlas-documents`. Configure CORS for `https://thepracticeatlas.com` and `https://api.thepracticeatlas.com`. Create IAM user with scoped read/write policy (s3:PutObject, s3:GetObject, s3:DeleteObject, s3:HeadObject). Block all public access.
- [x] **Domain + DNS** — `thepracticeatlas.com` → Vercel, `api.thepracticeatlas.com` → Railway.

---

## Phase 2: Infrastructure

### Railway (backend)
- [x] Provision PostgreSQL database
- [x] Deploy backend service (Docker build or Bun buildpack)
- [x] Set all env vars from `server/src/env.ts`:
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
- [x] Verify database migrations run on deploy (Dockerfile CMD runs `migrate.ts` before `index.ts`)
- [x] Custom domain `api.thepracticeatlas.com` with SSL
- [x] Verify health check: `GET https://api.thepracticeatlas.com/health` returns `{"status":"ok"}`

### Vercel (frontend)
- [x] Connect repo, set build command (`bun install && bun run build`) and output dir (`dist`)
- [x] Set `VITE_API_URL=https://api.thepracticeatlas.com`
- [x] Custom domain `thepracticeatlas.com` with SSL
- [x] Verify SPA routing works (vercel.json rewrite to index.html)

### Cross-origin verification
- [x] CORS: `CORS_ORIGINS=https://thepracticeatlas.com` (handled in `app.ts:33-37`)
- [x] Cookies: `secure: true`, `sameSite: 'Lax'`, `httpOnly: true` (set in `auth.ts` via `!env.isDev` for all cookies: session, OAuth state, PKCE verifier, 2FA pending)
- [x] Google OAuth redirect URI matches production domain
- [x] Test full auth flow: landing → Google OAuth → callback → session cookie → /app/dashboard

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
- [x] **Input sanitization for emails** — Emails use `text` field only, no HTML rendering. Safe as-is.
- [ ] **Rate limiting on upload endpoint** — Document upload presigned URL generation has no per-endpoint rate limit beyond the general 100/min (storage limit enforcement provides partial mitigation)
- [ ] **S3 bucket policy** — Verify Block Public Access is enabled; no bucket policy allowing public reads
- [ ] **Dependency audit** — Run `bun audit` on root and `cd server && bun audit`
- [x] **Profile phone change** — Profile update resets `phoneVerified` and `twoFactorEnabled` when phone changes (see Phase 0).
- [x] **CSP for API responses** — API responses now get `Content-Security-Policy: default-src 'none'` via else branch in `app.ts` security headers middleware.
- [x] **Session rotation on privilege change** — Implemented in `two-factor.ts`. Toggling 2FA, removing phone, and disabling 2FA all call `deleteOtherSessions(user.id, sessionToken)` to invalidate other sessions.

---

## Phase 4: Email & SMS Polish

- [x] **Email templates** — React Email templates implemented (`server/src/emails/`) for Welcome, SubscriptionConfirmed, PlanChanged, SubscriptionCancelled, ObligationReminder, and Test emails. Shared layout, styles, and render utility.
- [x] **SMS opt-out footer** — `sendSms` appends "Reply STOP to unsubscribe" to non-transactional messages. OTP/2FA codes excluded via `{ transactional: true }` flag.
- [x] **Delivery retry tuning** — Exponential backoff: attempt 0 immediate, then 2/4/8/16 minute delays between retries (computed from `updatedAt` + `deliveryAttempts`, no schema migration). Total span ~30 minutes instead of ~5 minutes.
- [ ] **Email deliverability** — Send test emails from production, check spam score, verify SPF/DKIM/DMARC pass.
- [x] **Email subject branding** — All emails consistently use "The Practice Atlas" branding (e.g., "Welcome to The Practice Atlas", "Reminder: {obligationName}", "Test email from The Practice Atlas").
- [x] **Twilio A2P 10DLC registration** — Required for US SMS sending. Register brand and campaign with Twilio.

---

## Phase 5: Testing

### Backend unit/integration tests
Existing tests: `plan-limits.test.ts`, `validators.test.ts`, `date-math.test.ts`, `error-handler.test.ts`, `obligations.test.ts`, `checklists.test.ts`, `pto.test.ts`. Run with `cd server && bun test`.

Still needed:
- [ ] Auth flow: Google OAuth → session creation → cookie → `GET /auth/me`
- [ ] Stripe: customer creation → checkout session → webhook handling (all 5 event types)
- [ ] Documents: upload URL → register → download URL → delete → S3 cleanup job
- [ ] Notifications: scheduler creates pending → delivery sends → status updates
- [x] Plan enforcement: obligation/storage/SMS limits reject at boundary (`plan-limits.test.ts`)
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
  - Data export endpoint implemented (`GET /api/profile/export`)
  - Account deletion cascades fully (done — `DELETE /api/profile` with Stripe + S3 + DB cleanup)
  - Consent backend API exists (`/api/settings/consent`); ConsentBanner still commented out in frontend
  - Right to access (profile endpoint returns user data)
- [x] **Demo language cleanup** — Removed "Free Demo Available" badge, "This is a demo application" disclaimer, changed "Try Demo" → "Try Free". Dashboard demo-mode text intentionally kept (gated behind `mode === 'demo'`).
- [ ] **SMS compliance** — A2P 10DLC registration, consent before sending (opt-out footer already implemented)
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
- [x] Email template system — React Email implemented with 6 templates, shared layout, and render utility (`server/src/emails/`)
- [ ] Browser push notifications (Web Push API)
- [ ] Annual billing option
- [ ] Free trial period (Stripe `trial_period_days`)
- [ ] 2FA backup codes (recovery when phone unavailable)
- [ ] TOTP support (authenticator app as alternative to SMS)
- [ ] Audit logging for sensitive operations (2FA changes, phone changes, account deletion)
- [ ] Multi-user workspace support (team/growth/scale tiers have `users > 1` but no multi-user logic exists)
- [ ] Subscription reconciliation job (periodic sync with Stripe API to catch missed webhooks)
