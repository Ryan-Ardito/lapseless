# Lapseless — Full SaaS MVP Launch Plan

## 1. Current State

**What works today:**
- Full obligation/compliance tracking UI (create, edit, delete, complete with auto-renewal)
- Document upload and management (metadata in localStorage, file blobs in IndexedDB via `idb`)
- PTO tracking with configurable allowances
- Checklist system with templates (end-of-month, end-of-year, custom)
- Client-side notifications derived from obligation due dates
- Landing page, legal pages (privacy, terms, cookies), consent banner
- Responsive layout with Mantine 8, TanStack Router, React 19

**What's missing for production:**
- No backend or database — all data lives in `localStorage` via `useLocalStorage` hook
- No authentication — anyone can access `/demo/*` routes
- No real notification delivery (email, push) — notifications are computed in-browser only
- No file persistence — documents stored in browser IndexedDB, lost on clear
- No multi-user support
- No deployment configuration

---

## 2. MVP Requirements

### Auth & Users

- **Auth provider:** Clerk (fastest integration with React) or Auth0. Clerk is recommended for speed — it provides drop-in `<SignIn>`, `<SignUp>`, session management, and middleware for the backend.
- **User model:** email, name, created_at. Clerk handles passwords/OAuth, so no need to store credentials.
- **Frontend changes:**
  - Add `<ClerkProvider>` at root, protect `/app/*` routes with auth guards
  - Replace `/demo` route prefix with `/app` — update `router.tsx` route definitions
  - Landing page CTA buttons link to `/sign-in` and `/sign-up` (Clerk hosted or embedded)
  - Replace `DemoContext` provider in the `/app` layout with API-backed data fetching (see Frontend Changes below)

### Backend API

- **Technology:** Hono on Node.js — lightweight, TypeScript-native, easy to deploy anywhere. Alternatively Express if the team prefers familiarity.
- **Structure:** `server/` directory in the monorepo, or a separate `api/` package.
- **Endpoints (REST):**

  | Resource | Endpoints |
  |---|---|
  | Obligations | `GET /api/obligations`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/toggle` |
  | Documents | `GET /api/documents`, `POST` (multipart upload), `GET /:id/download`, `DELETE /:id` |
  | PTO | `GET /api/pto/entries`, `POST`, `PATCH /:id`, `DELETE /:id`, `GET /api/pto/config`, `PATCH /api/pto/config` |
  | Checklists | `GET /api/checklists`, `POST /from-template`, `DELETE /:id`, `PATCH /:id/items/:itemId` |
  | Notifications | `GET /api/notifications`, `POST /mark-all-read`, `POST /clear` |
  | User Settings | `GET /api/settings`, `PATCH /api/settings` |
  | Profile | `GET /api/profile`, `PATCH /api/profile` |

- **Auth middleware:** Verify Clerk session token on every `/api/*` request, extract `userId`, scope all queries to that user.
- **File uploads:** Multipart form data → stream directly to S3-compatible storage (see Infrastructure). Store only metadata (name, displayName, size, type, s3Key) in the database.

### Database

- **Engine:** PostgreSQL (via Neon serverless or Supabase).
- **Schema (core tables):**

  ```
  users (id PK, clerk_id UNIQUE, email, name, created_at)
  obligations (id PK, user_id FK, name, category, due_date, start_date,
               reference_number, notes, links JSONB, recurrence JSONB,
               notification JSONB, ceu_tracking JSONB, completed, created_at)
  documents (id PK, user_id FK, obligation_id FK NULL, name, display_name,
             type, size, s3_key, added_at)
  pto_entries (id PK, user_id FK, date, hours, type, notes, created_at)
  pto_config (id PK, user_id FK UNIQUE, total_hours, year, types JSONB)
  checklists (id PK, user_id FK, type, title, period, items JSONB, created_at)
  notifications (id PK, user_id FK, obligation_id FK, title, message, type,
                 read, created_at)
  user_settings (id PK, user_id FK UNIQUE, theme, default_reminder JSONB)
  ```

- **Migrations:** Drizzle ORM (TypeScript-native, good Neon/Supabase support) or Prisma.
- **Seed data:** Convert `src/utils/seedData.ts` functions into a `seed.ts` script for development. Remove seed buttons from production UI.

### Notifications

- **Email:** Resend (simple API, good DX) or SendGrid. Send reminder emails when obligations approach due dates.
- **Background jobs:** A cron job or scheduled function (e.g., Hono + `node-cron`, or a platform cron like Railway/Fly.io cron) that runs daily:
  1. Query obligations where `due_date` is within the user's configured `reminderDaysBefore`
  2. Check notification preferences (channels, frequency)
  3. Send email via Resend
  4. Insert a record into the `notifications` table for in-app display
- **Browser push notifications:** Register a service worker, store push subscriptions in the database, send via Web Push API when reminders fire. This can be phase 2 if email is sufficient for launch.
- **Defer post-MVP:** SMS, WhatsApp.

### Frontend Changes

The core refactor is replacing local state with server state. Use **TanStack Query** (already in the TanStack ecosystem) for data fetching, caching, and mutations.

- **Replace hooks:**
  - `useLocalStorage` → removed entirely
  - `useObligations` → `useQuery`/`useMutation` calling `/api/obligations`
  - `useDocuments` → `useQuery`/`useMutation` calling `/api/documents`, upload via `fetch` multipart
  - `usePTO` → `useQuery`/`useMutation` calling `/api/pto/*`
  - `useChecklists` → `useQuery`/`useMutation` calling `/api/checklists`
  - `useNotifications` → `useQuery` calling `/api/notifications` (polled or WebSocket)
  - `useProfile`, `useConsent` → API-backed equivalents
- **Replace `DemoContext`:** The `/app` layout no longer needs to hoist all state. Each page component fetches its own data via TanStack Query. Remove `DemoContext.tsx`.
- **Loading & error states:** Add skeleton loaders and error boundaries to each page. TanStack Query provides `isLoading`, `isError` out of the box.
- **Remove seed data:** Delete `src/utils/seedData.ts`, `src/utils/checklistTemplates.ts` seed exports, and all `loadSeedData` / `onLoadSeed` props from components. The dashboard should show an empty state with a CTA instead.
- **Route rename:** `/demo/*` → `/app/*` in `router.tsx`. Keep `/demo` as a redirect or remove entirely.
- **Document storage:** Replace IndexedDB blob storage with S3 upload/download via presigned URLs or the backend's upload endpoint. Remove the `idb` dependency.

### Infrastructure & Deployment

| Concern | Recommendation |
|---|---|
| Frontend hosting | Vercel (zero-config for Vite, preview deploys on PRs) |
| Backend hosting | Railway or Fly.io (easy Node.js deploys, supports cron) |
| Database | Neon (serverless Postgres, generous free tier, branching for previews) |
| File storage | Cloudflare R2 (S3-compatible, no egress fees) or AWS S3 |
| Email | Resend |
| Auth | Clerk |
| Domain + SSL | Vercel handles frontend; backend via Railway/Fly custom domain. Both auto-SSL. |
| Secrets | Platform env vars (Vercel, Railway). Never committed. |
| CI/CD | GitHub Actions — lint, type-check, build on PR. Auto-deploy main to production. |

### What to Skip for MVP

- SMS / WhatsApp notifications
- Payment / subscription billing (launch free or with a simple tier later)
- Analytics / usage tracking
- Native mobile app
- Admin panel / team management
- Advanced reporting or export
- Audit logging
- Rate limiting (add before scaling, not before launch)

---

## 3. Verification

The MVP is ready to ship when:

- [ ] A new user can sign up, log in, and land on `/app/dashboard`
- [x] User can create, edit, complete, and delete obligations — data persists across sessions and devices *(backend API complete)*
- [x] User can upload documents (attached to obligations or standalone) and download them *(backend API complete, S3 presigned URLs)*
- [x] User can track PTO entries and configure allowances *(backend API complete)*
- [x] User can create checklists from templates and manage items *(backend API complete)*
- [x] User receives an email reminder when an obligation is approaching its due date *(Resend integration complete)*
- [x] In-app notification list shows unread reminders *(backend API complete)*
- [x] User data is fully isolated — no user can see another's data *(all queries scoped to userId)*
- [ ] The app is accessible at a production domain with HTTPS
- [ ] No seed data, localStorage, or IndexedDB usage remains in production code *(frontend integration pending)*
- [ ] CI pipeline passes lint, type-check, and build on every PR
