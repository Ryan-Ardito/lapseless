# Lapseless — Features & Coherence Review

## Overview

Lapseless is a compliance and obligation deadline tracker aimed at licensed professionals (lawyers, accountants, healthcare workers, etc.) who need to manage recurring regulatory deadlines, continuing education requirements, and document retention. The core pitch is "never miss a deadline" — the app lets users define obligations with due dates, get notified as deadlines approach, and track completion.

**Critical architectural note:** The app has a full backend (Hono/Drizzle/Postgres) and a full frontend (React/Vite), but they are disconnected. The frontend stores and reads all data from localStorage. The backend exposes REST endpoints that nothing calls. These are two separate applications that happen to live in the same repo. LAUNCH.md documents this gap explicitly.

---

## Features

### 1. Obligation Tracking

**What it is:** The core feature. Users create "obligations" — recurring deadlines with a name, description, due date, recurrence pattern, priority, status, and optional CEU (Continuing Education Unit) fields.

**User workflow:** Dashboard shows obligations as cards sorted by due date. Users can create, edit, complete, snooze, or delete obligations. Completing an obligation with a recurrence pattern auto-generates the next occurrence. Priority levels (low/medium/high/critical) and status (pending/in-progress/completed/overdue) drive visual indicators.

**Current state:** Fully functional against localStorage. The backend has a parallel `obligations` table and full CRUD routes, but the frontend never hits them.

### 2. Checklists

**What it is:** Standalone task lists, independent of obligations. Each checklist has a name and a set of items that can be checked off.

**User workflow:** Users create checklists from the Checklists page, add items, and check them off. Checklists can be edited, deleted, or duplicated.

**Current state:** Works via localStorage. Backend has a `checklists` table and routes. Same disconnect.

### 3. Document Storage

**What it is:** File upload and management. Users can upload documents (PDFs, images, etc.) associated with their account, tagged by category.

**User workflow:** Upload files via the Documents page. Files are listed with name, size, upload date, and category. Users can download or delete them. A storage meter shows usage against a 50MB limit.

**Current state:** Frontend stores file metadata in localStorage and file blobs in IndexedDB. The backend has S3 integration with tier-based limits (100MB–10GB) and a `documents` table — completely separate from what the frontend does. The 50MB limit shown in the UI is hardcoded client-side.

### 4. Notifications

**What it is:** Alerts when obligation deadlines are approaching. Two independent systems exist:

- **Backend:** A BullMQ scheduler runs every 15 minutes, queries the database for upcoming deadlines, and dispatches notifications via email (Resend) and SMS (Twilio). Supports configurable lead times (1 day, 3 days, 1 week, etc.).
- **Frontend:** A client-side timer runs every 30 seconds, checks obligations in localStorage, and generates browser toast notifications via react-hot-toast.

**User workflow:** Users configure notification preferences in Settings — choose channels (email, SMS, WhatsApp), set notification timing, and toggle notifications on/off per obligation.

**Current state:** The two notification systems are completely independent. The backend system works against the database (which has no data from the frontend). The frontend system works against localStorage. A user gets browser toasts but never email/SMS, because their obligations only exist in localStorage.

### 5. PTO Tracking

**What it is:** Vacation, sick, and personal day tracking. Users log time-off entries with type, dates, and status (pending/approved/denied).

**User workflow:** Users add PTO entries from the PTO page, view a calendar of time off, and see remaining balances.

**Current state:** localStorage on frontend, separate table/routes on backend. Same disconnect. See coherence issue #11.

### 6. History & Undo

**What it is:** An activity log that records every create, update, delete, and complete action, with the ability to undo deletions.

**User workflow:** History page shows a chronological feed of actions. Deleted items show a "Restore" button that calls `restoreObligation`, `restoreChecklist`, etc.

**Current state:** Entirely client-side. History entries are stored in localStorage. Restore functions exist in the localStorage API layer. No `history` table exists in the database, and no backend endpoints support this.

### 7. User Profile & Settings

**What it is:** Account settings including display name, notification preferences, consent toggles (GDPR-style), and diagnostic tools.

**User workflow:**
- Edit display name and notification channel preferences
- Toggle consent for document storage, notifications, and analytics
- "Send Test SMS" button to verify SMS setup
- "Check Storage" button to see storage usage

**Current state:** Profile data is in localStorage. The "Send Test SMS" button uses a `setTimeout` to fake success — it never hits the backend's actual Twilio integration. "Check Storage" reports IndexedDB quota, not S3 usage. Consent toggles don't enforce anything (see coherence issue #13).

### 8. Data Export & Import

**What it is:** Backup and restore for all user data.

**User workflow:** Settings page has "Export Data" (downloads a JSON file) and "Import Data" (uploads a JSON file that overwrites current data).

**Current state:** Export serializes localStorage to JSON. Import deserializes JSON into localStorage. No interaction with the backend.

### 9. Authentication

**What it is:** Google OAuth login flow.

**User workflow:** Landing page has a "Sign in with Google" button. Backend uses Arctic for OAuth, creates a session cookie, and stores the user in the database.

**Current state:** The backend auth flow works (Google OAuth → session cookie → user record in Postgres). But the frontend never checks for a session. `/app/*` routes have no auth guard — anyone can navigate directly to the dashboard without signing in. The localStorage data layer has no concept of "which user's data is this."

### 10. Payments & Subscription Tiers

**What it is:** Stripe integration with four pricing tiers (Starter, Professional, Business, Enterprise) offering different obligation limits, storage caps, and user counts.

**User workflow:** Pricing page shows plans. Users can subscribe via Stripe Checkout. Backend handles webhooks for subscription lifecycle.

**Current state:** Stripe integration exists on the backend. Plan limits are defined but never enforced — the frontend doesn't check subscription tier before allowing actions. Every new user gets a "starter" subscription by default.

---

## Coherence Issues (Sniff Test)

### The Big One

**1. Frontend and backend are disconnected.** This is the root cause of most issues below. The frontend is a localStorage-only app. The backend is a separate API with a real database. Nothing connects them. Every feature effectively exists twice in incompatible forms. This must be resolved before anything else matters.

### Notification & Communication

**2. Dual notification systems.** The backend BullMQ scheduler (every 15 min, email/SMS) and the frontend timer (every 30 sec, browser toasts) operate on different data stores with different schedules. A user's obligations live in localStorage, so the backend scheduler — which queries Postgres — will never find them.

**3. WhatsApp is a ghost.** WhatsApp appears as a notification channel option in the database schema, TypeScript types, and settings UI. But there is zero implementation for sending WhatsApp messages anywhere in the codebase. Selecting it does nothing.

**4. "Send Test SMS" is fake.** The Settings page button simulates success with a `setTimeout`. It never calls the backend's Twilio integration.

### Business Model

**5. Multi-user pricing with no team model.** Pricing tiers advertise 1/2/5/10 users, but there's no team, organization, invite, or member management anywhere — no database tables, no API endpoints, no UI. The `users` field in plan limits is never checked.

**6. Starter tier pricing confusion.** The landing page lists Starter at $9/month, positioning it as the entry-level paid plan. But the backend auto-assigns every new user the "starter" subscription, implying it's the free tier. No free tier appears on the pricing page.

### Data Integrity

**7. History/undo is client-only.** History is localStorage-only with no backend equivalent. Clearing browser data destroys all history. Undo/restore operations only work in the localStorage layer.

**8. Data export/import is localStorage-only.** Export and import serialize/deserialize localStorage JSON. When the backend is eventually connected, this system won't capture server-side data.

**9. Storage metrics are wrong.** "Check Storage" reports IndexedDB quota (browser storage), not actual document storage. The 50MB limit in the Documents UI is hardcoded, while the backend defines tier-based limits from 100MB to 10GB.

### Security & Access

**10. No auth gate on frontend routes.** `/app/*` routes render without any authentication check. The backend's Google OAuth flow produces a session cookie, but the frontend never validates it. Anyone can access the dashboard directly.

**11. Consent toggles are cosmetic.** GDPR-style consent toggles for document storage, notifications, and analytics exist in the UI, but toggling them off doesn't prevent those features from functioning. The consent state is stored but never checked.

### Feature Fit

**12. PTO tracking is tangential.** The app's value proposition is compliance deadline tracking. PTO (vacation/sick/personal days) is a loosely related HR function that doesn't integrate with obligation tracking. It doesn't affect deadline calculations, doesn't block obligations during time off, and doesn't tie into notifications. It's solving a different problem.

**13. CEU tracking has no dedicated view.** CEU fields exist on obligation cards, but there's no rollup view showing total hours earned vs. required across obligations. Professionals tracking CEUs toward a licensing requirement need aggregated reporting, not just per-obligation fields.
