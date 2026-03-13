# Lapseless — MVP Launch Checklist

## Phase 1: Frontend ↔ Backend Integration

The API switching layer (`src/api/*.ts`) already routes to `src/api/http/*.ts` when `VITE_API_URL` is set. The HTTP client (`src/api/http/client.ts`) uses `credentials: 'include'` and redirects to Google auth on 401. The real work is wiring everything up end-to-end and fixing contract mismatches.

### Environment & Config

- [ ] Create `.env` with `VITE_API_URL` pointing to the backend (e.g. `http://localhost:3000`)
- [ ] Verify the config flip works — set `VITE_API_URL`, confirm all API modules resolve to HTTP implementations instead of mock/localStorage
- [ ] Add Vite dev proxy in `vite.config.ts` to forward `/api` requests to the backend, avoiding CORS issues during development

### Auth Flow (End-to-End)

- [ ] Verify: click "Sign in with Google" → Google OAuth → callback → session cookie set → redirect to `/app`
- [ ] Verify: `getMe()` guard in `src/router.tsx` (line 68-78) blocks unauthenticated access to `/app/*` routes when `VITE_API_URL` is set
- [ ] Verify: 401 from any API call triggers redirect to `getLoginUrl()` (Google auth)
- [ ] Verify: `POST /auth/logout` clears session cookie and redirects to landing page
- [ ] Confirm cookie config (`httpOnly`, `sameSite`, `secure`, `domain`) works for local dev (localhost, non-HTTPS)

### API Contract Audit

Each `src/api/http/*.ts` module must match the backend's route contracts. Known issues:

- [ ] **Documents ↔ Obligations linking:** Frontend embeds documents on the obligation object; backend uses a separate `documents` table with an FK to `obligations.id` (nullable). The HTTP client must fetch documents separately or the backend must join them.
- [ ] **Obligations CRUD:** Confirm field names match between frontend types (`src/types/obligation.ts`) and backend schema (`server/src/db/schema.ts`). Watch for `notificationChannels` (JSONB) vs. frontend's nested object shape.
- [ ] **Notifications:** Confirm `GET /notifications` returns the same shape the frontend `Notifications.tsx` component expects. Backend stores notifications per-obligation; frontend expects a flat list.
- [ ] **Checklists:** Verify `checklist_type` enum and item structure match between frontend and backend.
- [ ] **PTO:** Confirm `pto_type` enum and date handling match.
- [ ] **Profile/Settings:** Backend has `user_settings` table (theme, default reminders); frontend stores these in localStorage. Wire up `GET/PUT /settings`.
- [ ] **History:** No backend `history` table or endpoints exist. History page will be empty in HTTP mode — either hide it or build backend support (see Phase 4).

### Notification System Dedup

- [ ] Disable the client-side 30-second notification timer (`src/hooks/useNotifications.tsx`) when `VITE_API_URL` is set — the backend BullMQ scheduler handles notifications via email/SMS
- [ ] Wire frontend notification UI to `GET /notifications` endpoint so users can see backend-generated notifications in-app
- [ ] Decide: should browser toasts still fire in HTTP mode? If so, poll the notifications endpoint or use SSE.

---

## Phase 2: Coherence Fixes

User-facing issues that undermine credibility. These should be fixed before anyone outside the team sees the app.

### Ghost Features (Remove or Stub)

- [ ] **WhatsApp channel:** Remove from `CHANNELS` array in `src/constants/theme.ts` (line 35) and from the `channel` enum in `server/src/db/schema.ts`. No WhatsApp sender exists anywhere. Keeping it in the picker misleads users.
- [ ] **"Send Test SMS" button:** In Settings (`src/components/Settings/Settings.tsx`), this uses `setTimeout` to fake success. Either wire it to the backend's Twilio integration (`server/src/lib/twilio.ts`) or remove it.

### Pricing & Plans

- [ ] **Starter tier:** Auto-assigned to all new users (free), but landing page (`src/components/Landing/LandingPage.tsx` lines 20-53) lists it at $9/month. Change Starter to "Free" with a clear upgrade path to Basic ($29/month).
- [ ] **Multi-user claims:** Pricing tiers advertise 1/2/5/10 users, but no team/org model exists — no tables, no API, no UI. Remove the user count from plan descriptions until this is built.
- [ ] **Plan limit enforcement:** Backend defines limits in `server/src/lib/plan-limits.ts` but they're never checked. Add middleware or service-layer checks for obligation count, storage usage, and SMS credits before allowing creates/uploads/sends.

### Storage & Data

- [ ] **Storage metrics mismatch:** Documents page (`src/components/Documents/Documents.tsx` line 311) hardcodes a 50MB limit. The backend defines tier-based limits (100MB–10GB). Pull the real limit from `GET /stripe/status` and compute actual usage from document sizes in the database.
- [ ] **"Check Storage" button:** Reports IndexedDB quota via `navigator.storage.estimate()`, not actual document storage. In HTTP mode, query the backend for real usage.
- [ ] **Export/Import:** `src/utils/dataExport.ts` serializes localStorage. In HTTP mode, these buttons are misleading — they won't capture server-side data. Either hide them when `VITE_API_URL` is set, or build backend export (GET all user data as JSON) / import endpoints.
- [ ] **"Delete All My Data":** `src/utils/dataDeletion.ts` clears localStorage only. In HTTP mode, wire this to a backend endpoint that deletes all user data (obligations, documents, notifications, settings, etc.) and confirm with the user before executing.

---

## Phase 3: Deployment

### Backend

- [ ] Choose hosting (Fly.io / Railway / VPS) — backend runs as a single Docker container (`server/Dockerfile`) on port 3000
- [ ] Provision Postgres database
- [ ] Provision Redis instance (required by BullMQ notification scheduler)
- [ ] Provision S3-compatible object storage (or use AWS S3 directly) for document uploads
- [ ] Set all required environment variables:
  - `DATABASE_URL`, `REDIS_URL`
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, tier price IDs
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - `RESEND_API_KEY`, `EMAIL_FROM`
  - `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS`
- [ ] Run initial migration (`bun run src/db/migrate.ts`) and verify schema
- [ ] Verify `/health` endpoint returns 200

### Frontend

- [ ] Build frontend with `VITE_API_URL` set to production backend URL
- [ ] Deploy static assets (Vercel / Cloudflare Pages / Netlify / same host as backend)

### DNS & TLS

- [ ] Point domain to frontend hosting
- [ ] Point API subdomain (e.g. `api.lapseless.com`) to backend
- [ ] Ensure TLS on both — session cookies require `secure: true` in production

### Auth (Production)

- [ ] Create Google OAuth credentials for production (Google Cloud Console)
- [ ] Set authorized redirect URI to `https://api.lapseless.com/auth/google/callback`
- [ ] Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars
- [ ] Configure session cookie `domain` for production (e.g. `.lapseless.com`) so the cookie is sent to both frontend and API subdomains

### Payments

- [ ] Create Stripe products and prices for Basic/Professional/Business tiers
- [ ] Set `STRIPE_SECRET_KEY` and tier price IDs in production env
- [ ] Configure Stripe webhook endpoint (`https://api.lapseless.com/stripe-webhook`) and set `STRIPE_WEBHOOK_SECRET`
- [ ] Build frontend payment UI — currently no Stripe Checkout button exists on the frontend; the backend's `POST /stripe/create-checkout` and `GET /stripe/portal` endpoints need a corresponding UI

### Email

- [ ] Verify sending domain with Resend (DNS records)
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `reminders@lapseless.com`)
- [ ] Send a test email to verify delivery

### SMS

- [ ] Verify Twilio phone number is active and can send SMS
- [ ] Test SMS delivery end-to-end (create obligation with SMS channel → wait for BullMQ scheduler → confirm SMS received)

---

## Phase 4: Post-MVP (Deferred)

These are real features or improvements but not required for a functional MVP launch.

- [ ] **History/undo backend persistence** — No `history` table exists. Build backend storage for activity log and restore operations.
- [ ] **CEU rollup view** — CEU fields exist per-obligation but there's no aggregate reporting (total hours earned vs. required by licensing body).
- [ ] **Consent enforcement** — GDPR-style toggles exist in UI but don't prevent features from functioning when toggled off.
- [ ] **Team/org model** — Multi-user support for firms. Requires org table, invites, role-based access, shared obligations.
- [ ] **WhatsApp integration** — Twilio WhatsApp API for notification delivery.
- [ ] **Advanced data export** — Server-side export (PDF reports, CSV, full account download).
- [ ] **PTO ↔ obligation integration** — Adjust deadline notifications when user is on PTO.
- [ ] **Offline/sync mode** — Keep localStorage as offline cache, sync to backend when online.
