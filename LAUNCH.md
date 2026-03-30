# Launch Checklist

Phased checklist for launching The Practice Atlas (Lapseless) to paying customers.
**Stack:** React 19/Vite/Mantine + Hono/Bun/Drizzle/PostgreSQL — single Railway deployment (frontend served by Hono)
**Integrations:** Stripe (billing), Google OAuth (auth), Twilio (SMS), Resend (email), S3 (storage)

> The frontend runs in mock mode (localStorage) by default and switches to HTTP mode when `VITE_API_URL` is set. History is intentionally client-side only — not a gap.

---

## Current State (2026-03-30)

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
- Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, CSP)
- CORS whitelist, httpOnly/Secure/SameSite=Lax cookies
- Stripe webhook signature verification
- Input validation (Zod) on all endpoints
- Health check endpoint with database connectivity check
- Background jobs: notification scheduler, delivery, email delivery, session cleanup, S3 cleanup, org cleanup, rate-limit pruning
- Request ID tracking and structured logging (JSON in production)
- Database migrations with retry logic (exponential backoff, 3 attempts)
- OAuth error redirects to `/?error=...` with toast display on landing page
- Consent backend API (`GET/PUT/DELETE /api/settings/consent`) stores consent per user in DB
- React Email templates (Welcome, SubscriptionConfirmed, PlanChanged, SubscriptionCancelled, ObligationReminder, Invite, Test) with shared layout and styles
- Session rotation on 2FA privilege changes (toggle, remove-phone, disable all invalidate other sessions)
- Pricing CTAs trigger Stripe checkout for selected tier (logged-in demo users -> direct checkout, not-logged-in -> OAuth -> checkout)
- Production data export via `GET /api/profile/export` (all user data aggregated, s3Keys stripped)
- Delivery retry with exponential backoff (2/4/8/16 min delays between attempts)
- Reliable transactional email delivery via `pending_emails` queue with background job (optimistic locking, exponential backoff, max 8 attempts)
- Failed payment email (`PaymentFailedEmail` template) sent when `invoice.payment_failed` fires
- Past-due red banner in app header linking to billing when subscription status is `past_due`
- 2FA pending token consumption is atomic (DELETE...RETURNING prevents race condition)
- Welcome email directs new users to pricing page (`/#pricing`)
- Backend unit tests (plan-limits, validators, date-math, error-handler, obligations, checklists, pto)
- Hono serves frontend static files when `SERVE_STATIC=true` with SPA fallback
- Multi-stage Dockerfile: deps -> build frontend -> production runtime with healthcheck
- Graceful shutdown on SIGTERM/SIGINT (stops background jobs)
- Body size limits (1 MB on API/auth/invite routes; Stripe webhook exempt)
- Org membership + role-based access control (owner/admin/member hierarchy)
- Invite system with hashed tokens, expiry, and email delivery
- Organization soft-delete with 30-day recovery window

### What needs attention before launch

#### Blockers (must fix)
1. ~~**`index.html` placeholder URLs**~~ — ✅ All URLs now point to `thepracticeatlas.com`.
2. ~~**`sitemap.xml` placeholder URL**~~ — ✅ URL now points to `thepracticeatlas.com`.
3. ~~**`robots.txt` placeholder URL**~~ — ✅ Sitemap URL now points to `thepracticeatlas.com`.
4. **`SERVE_STATIC=true` on Railway** — Required for Hono to serve the frontend. Without it, only API endpoints are available.
5. **`BACKEND_URL` build arg in Railway** — Dockerfile uses `ARG BACKEND_URL` to set `VITE_API_URL` at frontend build time. Railway must pass this as a build argument.
6. **Stripe live mode** — Switch from test keys to live API keys, webhook secret, and price IDs before accepting real payments.

#### Important (should fix)
7. **ConsentBanner commented out** — `router.tsx:11,54` has ConsentBanner import/component commented out. Backend consent API exists. Wire it up for cookie/GDPR compliance.
8. ~~**No failed payment email**~~ — ✅ `PaymentFailedEmail` template queued when `invoice.payment_failed` fires. Stripe does not send dunning emails by default — disable Stripe's automated emails in dashboard to avoid duplicates if you later enable them.
9. ~~**No past_due access restriction**~~ — ✅ Red banner shown at top of app when subscription is `past_due`, linking to billing settings. Users retain access (grace period) but see a clear warning.
10. **Email deliverability testing** — Send test emails from production domain. Check spam scores. Verify SPF/DKIM/DMARC pass for `thepracticeatlas.com`.
11. **S3 bucket policy verification** — Confirm Block Public Access is enabled. No bucket policy allowing public reads.
12. **Dependency audit** — Run `bun audit` on root and `cd server && bun audit` before launch.
13. **Legal page review** — Review PrivacyPolicy, TermsOfService, CookiePolicy component content for accuracy.
14. **Copyright entity** — Footer shows "Data Locality LLC" — confirm this is the correct operating entity.

#### Nice to have (won't block launch)
15. **Error tracking** — Add Sentry to frontend and backend for crash reporting and alerting.
16. **Uptime monitoring** — External service polling `https://api.thepracticeatlas.com/health` (or `https://thepracticeatlas.com/health` if single domain).
17. **Database backups** — Enable automated backups in Railway.
18. **Log aggregation** — Backend outputs structured JSON. Pipe to Railway logs or external service.
19. **Rate limit on upload endpoint** — Document upload presigned URL generation has no per-endpoint rate limit beyond the general 100/min.

---

## Phase 0: Code Fixes (blockers)

### Critical (all resolved)

- [x] **Stripe customer creation** — OAuth callback calls `createOrGetStripeCustomer` and passes customer ID to `ensureSubscription`.
- [x] **Backend account deletion** — `DELETE /api/profile` cascades: Stripe customer deletion, S3 object deletion, full DB cleanup.
- [x] **OAuth error redirect** — Redirects to `/?error=oauth_invalid` / `/?error=oauth_failed` with toast display.

### Important

- [x] **Billing management UI** — BillingSection shows tier, status, period end, limits, upgrade/manage buttons.
- [x] **Pricing CTA -> Stripe checkout** — Direct checkout for logged-in demo users; OAuth redirect with tier for anonymous users.
- [x] **Demo language removal** — Removed "Free Demo Available" badge, disclaimer. Changed "Try Demo" to "Try Free".
- [ ] **ConsentBanner** — `router.tsx:11,54` commented out. Backend consent API exists. Wire `useConsent` hook to backend.
- [x] **Consent backend** — CRUD at `GET/PUT/DELETE /api/settings/consent`.
- [x] **Data export** — `GET /api/profile/export` with S3 keys stripped.
- [x] **Data import hidden** — Import button hidden in production mode.

### Still needed

- [x] **Fix `index.html` meta tags** — All URLs now point to `thepracticeatlas.com`.
- [x] **Fix `sitemap.xml`** — URL now points to `thepracticeatlas.com`.
- [x] **Fix `robots.txt`** — Sitemap URL now points to `thepracticeatlas.com`.
- [x] **Failed payment notification** — `PaymentFailedEmail` template queued via `pending_emails` when `invoice.payment_failed` fires.

### Security (all resolved)

- [x] **Email HTML injection** — Notifications use `text` field only, not HTML.
- [x] **SMS opt-out compliance** — "Reply STOP to unsubscribe" appended to non-transactional SMS.
- [x] **Profile phone change** — Resets `phoneVerified` and `twoFactorEnabled` when phone changes.
- [x] **2FA pending token race condition** — `validatePending2faToken` now uses atomic `DELETE...RETURNING` instead of `SELECT` then `DELETE`.
- [x] **Email delivery reliability** — Transactional emails (welcome, invite, billing) now queued to `pending_emails` table with background job delivery, optimistic locking, and exponential backoff retries (max 8 attempts). Prevents silent email loss.

---

## Phase 1: Third-Party Account Setup

- [x] **Google OAuth** — Production credentials. Redirect URI: `https://api.thepracticeatlas.com/auth/google/callback`.
- [x] **Stripe products/prices** — 4 products: Solo ($9), Team ($29), Growth ($49), Scale ($99). Price IDs recorded.
- [x] **Stripe webhook endpoint** — `https://api.thepracticeatlas.com/stripe/webhook` (NOT `/api/stripe/webhook`). Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed.
- [x] **Stripe customer portal** — Enabled with subscription management, cancellation, invoice history, payment methods.
- [x] **Resend** — Domain verified. SPF/DKIM/DMARC configured.
- [x] **Twilio** — Phone number purchased. A2P 10DLC registered.
- [x] **S3** — Bucket `practice-atlas-documents` created. CORS configured. IAM user scoped. Public access blocked.
- [x] **Domain + DNS** — `thepracticeatlas.com` and `api.thepracticeatlas.com` configured.

---

## Phase 2: Infrastructure (Railway-only)

### Railway deployment

Since the frontend is served by Hono (not Vercel), everything runs on a single Railway service.

- [x] Provision PostgreSQL database
- [x] Deploy backend service (Dockerfile build)
- [ ] Set `SERVE_STATIC=true` — Required for Hono to serve frontend static files from `dist/`
- [ ] Set `BACKEND_URL` as Railway build argument — Dockerfile uses `ARG BACKEND_URL` to embed `VITE_API_URL` at frontend build time
- [x] Set all env vars from `server/src/env.ts`:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DATABASE_URL` (Railway Postgres connection string)
  - `FRONTEND_URL=https://thepracticeatlas.com`
  - `BACKEND_URL=https://api.thepracticeatlas.com`
  - `CORS_ORIGINS=https://thepracticeatlas.com`
  - `SERVE_STATIC=true`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - `RESEND_API_KEY`, `EMAIL_FROM`
  - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- [x] Database migrations run automatically on deploy (Dockerfile CMD)
- [x] Custom domain with SSL
- [x] Health check: `GET /health` returns `{"status":"ok"}`

### Single-domain considerations

If serving both API and frontend from the same origin (e.g., `thepracticeatlas.com`):
- CORS is not needed (same-origin requests)
- `CORS_ORIGINS` can equal `FRONTEND_URL`
- Cookies are first-party (no cross-site issues)
- CSP `connect-src 'self'` is sufficient

If using separate domains (API on `api.thepracticeatlas.com`, frontend on `thepracticeatlas.com`):
- CORS must allow frontend origin
- Cookies must be configured for cross-origin (already done with `credentials: true`)
- `BACKEND_URL` build arg must match the API domain

### Vercel (not used for production)

`vercel.json` exists for development/preview only. Production frontend is served by Hono on Railway.

---

## Phase 3: Security Hardening

### Already implemented
- [x] Security headers: HSTS (2yr), X-Frame-Options: DENY, nosniff, Referrer-Policy, CSP (`app.ts:40-54`)
- [x] CORS whitelist (`app.ts:33-38`)
- [x] Rate limiting: auth (10/min, 30/hr per IP), API (100/min per user) (`middleware/rate-limit.ts`)
- [x] Session tokens hashed before storage (`auth.service.ts`)
- [x] OTP codes hashed with timing-safe comparison (`otp.service.ts`)
- [x] Parameterized queries via Drizzle ORM (no SQL injection)
- [x] Input validation with Zod on all endpoints (`lib/validators.ts`)
- [x] Stripe webhook signature verification (`stripe-webhook.ts:19`)
- [x] S3 user-scoped paths prevent cross-user access (`documents.ts`)
- [x] Dev-only mock OAuth gated behind `env.isDev` (`app.ts:63-65`)
- [x] OAuth PKCE + state parameter validation (`auth.ts`)
- [x] Presigned URLs with short expiration (5 min upload, 15 min download)
- [x] Session rotation on privilege change (2FA toggle, phone removal)
- [x] Body size limits (1 MB) on API/auth/invite routes
- [x] No `dangerouslySetInnerHTML` or `eval()` in frontend

### Still needed
- [ ] **S3 bucket policy** — Verify Block Public Access is enabled
- [ ] **Dependency audit** — Run `bun audit` on root and server
- [ ] **Rate limiting on upload endpoint** — Document upload presigned URL generation has no per-endpoint rate limit beyond the general 100/min (storage limit enforcement provides partial mitigation)

---

## Phase 4: Email & SMS Polish

- [x] **Email templates** — 8 React Email templates with shared layout and styles (added PaymentFailedEmail)
- [x] **SMS opt-out footer** — "Reply STOP to unsubscribe" on non-transactional messages
- [x] **Delivery retry** — Exponential backoff: 2/4/8/16 min delays (~30 min total span)
- [x] **Email subject branding** — Consistent "The Practice Atlas" branding
- [x] **Twilio A2P 10DLC** — Registered
- [x] **Reliable email delivery** — Transactional emails queued to `pending_emails` table with background job (`email-delivery`, every 30s), optimistic locking, and exponential backoff (max 8 attempts). No more fire-and-forget `.catch()` pattern.
- [x] **Failed payment email** — `PaymentFailedEmail` template. Queued via `pending_emails` when `invoice.payment_failed` webhook fires. Directs user to update payment method.
- [ ] **Email deliverability** — Send test emails from production. Check spam score. Verify SPF/DKIM/DMARC pass.

---

## Phase 5: Testing

### Backend unit/integration tests
Existing: `plan-limits.test.ts`, `validators.test.ts`, `date-math.test.ts`, `error-handler.test.ts`, `obligations.test.ts`, `checklists.test.ts`, `pto.test.ts`. Run with `cd server && bun test`.

Still needed:
- [ ] Auth flow: Google OAuth -> session creation -> cookie -> `GET /auth/me`
- [ ] Stripe: customer creation -> checkout session -> webhook handling (all 5 event types)
- [ ] Documents: upload URL -> register -> download URL -> delete -> S3 cleanup job
- [ ] Notifications: scheduler creates pending -> delivery sends -> status updates
- [x] Plan enforcement: obligation/storage/SMS limits reject at boundary
- [ ] 2FA: setup -> verify phone -> enable -> login challenge -> verify OTP
- [ ] Account deletion: cascades through all tables + Stripe + S3

### E2E Manual Checklist
- [ ] **Signup flow:** Landing -> Google OAuth -> redirect to dashboard (user + subscription created)
- [ ] **Checkout flow:** Settings -> select plan -> Stripe checkout -> webhook -> subscription active
- [ ] **Document upload:** Upload -> S3 -> download link works -> delete -> S3 cleanup
- [ ] **Notification (SMS):** Create obligation with SMS channel -> scheduler -> SMS delivered
- [ ] **Notification (email):** Create obligation with email channel -> scheduler -> email arrives
- [ ] **SMS test:** Settings -> Send Test SMS -> message arrives on phone
- [ ] **2FA flow:** Add phone -> verify -> enable 2FA -> log out -> log in -> OTP -> access granted
- [ ] **Billing management:** Settings -> Manage Billing -> Stripe portal -> change plan -> webhook updates
- [ ] **Account deletion:** Settings -> Delete All Data -> all records removed, Stripe deleted, S3 deleted
- [ ] **Plan limits:** Create obligations up to tier limit -> next creation blocked (403)
- [ ] **PTO:** Create entries, set yearly allowance, verify hours
- [ ] **Checklists:** Create, complete items, mark complete
- [ ] **Demo mode:** `/demo/*` routes work with localStorage (no auth)
- [ ] **Static file serving:** Frontend loads correctly from Hono on Railway (`SERVE_STATIC=true`)
- [ ] **SPA routing:** Deep links like `/app/orgs/:id/dashboard` work on page refresh

### Stripe-specific
- [ ] Test card `4242 4242 4242 4242` completes checkout
- [ ] Webhook at `/stripe/webhook` (not `/api/stripe/webhook`) fires correctly
- [ ] Failed payment (`4000 0000 0000 0341`) -> `past_due` status
- [ ] Upgrade mid-cycle -> prorations applied
- [ ] Cancel -> `cancelAtPeriodEnd: true` -> access until period end -> downgrade
- [ ] Reactivate from portal before period end -> cancel flag removed

---

## Phase 6: Legal & Compliance

- [ ] **Legal page review** — Review PrivacyPolicy, TermsOfService, CookiePolicy for accuracy
- [ ] **GDPR compliance:**
  - [x] Data export (`GET /api/profile/export`)
  - [x] Account deletion cascades fully (`DELETE /api/profile`)
  - [x] Consent backend API (`/api/settings/consent`)
  - [ ] ConsentBanner frontend integration (commented out)
  - [x] Right to access (profile endpoint)
- [x] **Demo language cleanup** — Removed misleading demo language
- [ ] **Cookie consent** — ConsentBanner must be shown before setting non-essential cookies/storage
- [ ] **Copyright/branding** — Confirm "Data Locality LLC" is the correct operating entity

---

## Phase 7: Monitoring & Operations

- [ ] **Error tracking** — Sentry (or similar) for frontend + backend crash reporting
- [ ] **Uptime monitoring** — External health check polling `/health`
- [ ] **Database backups** — Enable automated backups in Railway
- [ ] **Alerting** — 5xx spikes, health check failures, delivery failure rate, webhook failures
- [ ] **Log aggregation** — Structured JSON logs -> Railway or external service
- [ ] **Rate limit monitoring** — In-memory rate limiter resets on restart (acceptable for single-instance)

---

## Phase 8: Launch Day

- [ ] Fix all Phase 0 blockers (placeholder URLs, ConsentBanner)
- [ ] `SERVE_STATIC=true` confirmed on Railway
- [ ] `BACKEND_URL` build argument set on Railway
- [ ] Switch Stripe to live mode (new API keys + webhook secret + price IDs)
- [ ] DNS propagation verified
- [ ] SSL certificates valid
- [ ] All env vars set with production values (no test/dev values)
- [ ] `NODE_ENV=production` confirmed
- [ ] Final E2E pass on production environment
- [ ] Verify `/auth/dev/*` routes are NOT accessible in production
- [ ] Verify frontend loads and SPA routing works on Railway
- [ ] Monitor first hour: error rates, signups, payments, delivery rates

---

## Post-Launch Backlog

Not blocking launch, but worth tracking.

- [ ] CI/CD pipeline (GitHub Actions: lint, test, build, deploy)
- [ ] Server-side history (cross-device sync)
- [ ] Browser push notifications (Web Push API)
- [ ] Annual billing option
- [ ] Free trial period (Stripe `trial_period_days`)
- [ ] 2FA backup codes
- [ ] TOTP support (authenticator app as alternative to SMS)
- [ ] Audit logging for sensitive operations
- [ ] Multi-user workspace support (team/growth/scale tiers have `users > 1` but no multi-user logic exists)
- [ ] Subscription reconciliation job (periodic Stripe sync to catch missed webhooks)
- [ ] Webhook idempotency tracking (prevent duplicate processing on Stripe retries)
- [x] Past-due access restrictions — red banner in app header when subscription is `past_due`, linking to billing settings
- [ ] Graceful shutdown timeout (currently exits immediately after clearing intervals; should drain in-flight requests)
- [ ] Non-root user in Dockerfile (currently runs as root)
