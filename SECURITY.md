# Security Overview — Lapseless (Practice Atlas)

This document catalogs known attack surfaces, current mitigations, accepted risks, and future hardening recommendations.

---

## 1. Architecture Overview

| Component | Technology | Attack Surface |
|---|---|---|
| Backend API | Hono on Bun | Session management, input validation, rate limiting |
| Frontend | React (Vite) | XSS, open redirects |
| Database | PostgreSQL (Drizzle ORM) | SQL injection, credential exposure |
| Object Storage | S3-compatible (presigned URLs) | Data exfiltration, storage abuse |
| Auth | Google OAuth (Arctic, PKCE) | Account takeover, session hijacking |
| 2FA | TOTP via SMS (Twilio) | SIM swap, OTP brute force |
| Billing | Stripe (webhooks) | Webhook forgery, checkout abuse |
| Email | Resend | Notification spam |
| Deployment | Railway (Docker) | Env var leakage, compute abuse |

---

## 2. User Data Compromise Vectors

### 2.1 Session Hijacking

**Description:** An attacker steals a session cookie via XSS, network sniffing, or browser extension compromise, gaining full account access.

**Current mitigations:**
- Cookies set with `httpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`
- Session tokens are 32 bytes of `crypto.getRandomValues` randomness, stored as SHA-256 hashes in the database — a leaked hash cannot be replayed
- CSP restricts script sources to `'self'`; no inline scripts allowed
- HSTS enforced in production (`max-age=63072000; includeSubDomains`)
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

**Residual risk:** Browser extension compromise or physical device access could still extract cookies.

### 2.2 OAuth Account Takeover

**Description:** If an attacker compromises a user's Google account, they inherit full access to Lapseless since Google OAuth is the sole primary auth mechanism.

**Current mitigations:**
- 2FA (SMS OTP) adds a second factor after OAuth sign-in
- OAuth uses PKCE flow with state parameter validation, preventing authorization code interception
- Code verifier and state cookies expire in 10 minutes and are deleted after use

**Residual risk:** Users who have not enabled 2FA are fully dependent on Google account security.

### 2.3 Database Exposure

**Description:** A leaked `DATABASE_URL` or SQL injection vulnerability could expose all user data.

**Current mitigations:**
- Drizzle ORM exclusively — no raw SQL queries anywhere in the codebase. All queries are parameterized
- `DATABASE_URL` is a required environment variable validated at startup via Zod
- Session tokens stored as SHA-256 hashes, not plaintext
- OTP codes stored as SHA-256 hashes

**Residual risk:** A compromised Railway environment or backup could expose the connection string.

### 2.4 S3 Data Exfiltration

**Description:** Leaked S3 credentials or abuse of presigned URLs could expose user-uploaded documents.

**Current mitigations:**
- Upload presigned URLs expire in **5 minutes**
- Download presigned URLs expire in **15 minutes**
- S3 keys are scoped to user ID (`uploads/{userId}/...`)
- S3 key format is validated by Zod regex: `^uploads\/[0-9a-f-]{36}\/`
- File names sanitized to `[a-zA-Z0-9._-]` before use in S3 keys
- `Content-Disposition` header sanitized per RFC 6266

**Residual risk:** A valid presigned download URL can be shared with anyone during its 15-minute window. This is inherent to presigned URL design.

### 2.5 Phone Number Exposure

**Description:** Phone numbers are stored in plaintext in the database for SMS delivery.

**Current mitigations:**
- Phone numbers are masked in API responses
- Database access is restricted to the application layer (no public endpoint)

**Residual risk:** A database breach would expose phone numbers in cleartext.

### 2.6 Insecure Direct Object Reference (IDOR)

**Description:** An attacker could attempt to access another user's resources by guessing or enumerating IDs.

**Current mitigations:**
- All database queries include `userId` scoping — resources are never fetched by ID alone
- UUIDs used for resource identifiers (not sequential integers)
- Zod validation on all route parameters

**Residual risk:** Low, given consistent userId scoping enforced at the query layer.

### 2.7 Error Message Information Disclosure

**Description:** Unhandled errors could leak stack traces, database schema details, or internal paths to the client.

**Current mitigations:**
- Application errors use `AppError` with controlled status codes and messages
- Production error responses are generic; detailed errors are logged server-side only

**Residual risk:** A new unhandled error path could inadvertently leak details.

---

## 3. Cloud Resource Abuse (Billing Risk)

### 3.1 S3 Storage Abuse

**Description:** An attacker with an account could upload excessive files to inflate S3 costs.

**Current mitigations:**
- **50 MB per-file size cap** enforced at the validation layer (both upload URL request and document registration)
- Per-tier storage limits enforced before presigned URL generation:
  - Solo: 250 MB, Team: 2 GB, Growth: 10 GB, Scale: 25 GB
- Upload presigned URLs include `Content-Length` constraints
- Demo tier has 0 MB storage (no uploads)

### 3.2 Twilio SMS Abuse

**Description:** Triggering excessive OTP or notification SMS to inflate Twilio costs.

**Current mitigations:**
- Per-tier monthly SMS limits: Solo 50, Team 150, Growth 300, Scale 750
- `checkSmsLimit()` enforced on **all** SMS-sending code paths, including unauthenticated ones (2FA resend, OAuth callback)
- OTP rate limit: max 5 requests per user per 15 minutes
- OTP codes expire after 5 minutes, max 5 verification attempts per code
- Demo tier has 0 SMS allocation
- OAuth callback wraps SMS send in a non-fatal try-catch — quota exhaustion doesn't block login (user lands on verify page and can retry)

### 3.3 Resend Email Abuse

**Description:** Triggering mass email sends via notification features.

**Current mitigations:**
- Notification scheduling controlled by application logic
- Plan-tier limits restrict total notification volume

### 3.4 Stripe Checkout Abuse

**Description:** Creating many checkout sessions without completing payment.

**Current mitigations:**
- Stripe handles session lifecycle — incomplete sessions expire automatically
- No direct cost incurred for abandoned checkout sessions
- Checkout creation requires authentication

### 3.5 Compute Abuse (API Flooding)

**Description:** Overwhelming the server with requests to degrade service or increase compute costs.

**Current mitigations:**
- **Request body size limit:** 1 MB on `/api/*` and `/auth/*` routes (returns 413 when exceeded). Stripe webhook at `/stripe/*` is unaffected
- Authenticated API: **100 requests per 60 seconds** per user (sliding window)
- Auth endpoints: **10 requests per minute** + **30 requests per hour** per IP
- IP extraction from `X-Forwarded-For` / `X-Real-IP` headers
- Expired rate limit entries are pruned automatically

**Accepted risk:** Rate limit state is in-memory and resets on deploy/restart. See §8.

### 3.6 Database Connection Exhaustion

**Description:** Excessive concurrent requests could exhaust database connections.

**Current mitigations:**
- The `postgres` driver provides built-in connection pooling (default: 10 max connections)
- No explicit pool configuration is set — uses library defaults

**Residual risk:** Under sustained load, the default pool size may be insufficient. See §9.

---

## 4. Authentication & Session Security

### OAuth PKCE Flow
- Authorization uses `generateState()` + `generateCodeVerifier()` from Arctic
- State and code verifier stored in httpOnly cookies with 10-minute expiry
- Both are validated and deleted on callback — single use
- Redirect URI validated to start with `/` and not contain `//` (prevents open redirect)
- `prompt=select_account` always shown

### Session Tokens
- **32 bytes** from `crypto.getRandomValues` (256 bits entropy)
- Stored in database as **SHA-256 hash** — raw token only exists in cookie
- **30-day** sliding window expiry, extended when within 15 days of expiration
- **90-day** hard maximum lifetime from creation
- Sessions invalidated when 2FA is toggled (all other sessions for that user)

### 2FA Implementation
- 6-digit numeric OTP derived from 4 cryptographic random bytes
- OTP stored as **SHA-256 hash** in database
- Verification uses `crypto.timingSafeEqual` — no timing side-channel
- **5 max attempts** per OTP code
- **5-minute** OTP expiry
- **5 OTPs per 15 minutes** per user rate limit
- 2FA pending token: 32-byte random, SHA-256 hashed, 5-minute expiry, single use

### Cookie Configuration
| Attribute | Value |
|---|---|
| `httpOnly` | `true` |
| `secure` | `true` in production |
| `sameSite` | `Lax` |
| `path` | `/` |
| `maxAge` | 30 days (session), 10 min (OAuth state), 5 min (2FA pending) |

### Dev-Only Mock OAuth
- Mock OAuth endpoint exists but is gated behind `env.isDev` — unreachable in production
- Environment validation ensures `NODE_ENV` is set correctly

---

## 5. Input Validation & Injection Prevention

### Zod Validation
All API inputs are validated through Zod schemas before processing:
- Phone numbers: E.164 regex (`^\+[1-9]\d{1,14}$`)
- OTP codes: exactly 6 digits (`^\d{6}$`)
- File uploads: name (1–255 chars), MIME type, size capped at **50 MB** per file
- S3 keys: regex-validated format (`^uploads\/[0-9a-f-]{36}\/`)
- Obligation fields: enum categories, date formats, string length limits
- Checkout: tier must be one of `solo | team | growth | scale`

### SQL Injection Prevention
- **Drizzle ORM exclusively** — all queries are parameterized
- No raw SQL strings anywhere in the codebase
- No string concatenation in query construction

### File Name Sanitization
- S3 key file names stripped to `[a-zA-Z0-9._-]` (all other characters replaced with `_`)
- `Content-Disposition` headers sanitized: control characters and quotes removed, UTF-8 encoded fallback per RFC 6266

### XSS Prevention
- No `innerHTML`, `dangerouslySetInnerHTML`, or `eval()` usage in the codebase
- CSP restricts scripts to `'self'` only
- React's default JSX escaping active

---

## 6. Infrastructure & Deployment

### Railway Deployment
- Deployed via Dockerfile
- Health checks configured for uptime monitoring
- Database migrations run automatically on startup

### HTTPS & Transport Security
- HSTS header in production: `max-age=63072000; includeSubDomains` (2 years)
- `Secure` flag on all cookies in production
- Railway terminates TLS at the edge

### Security Headers
| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-XSS-Protection` | `0` (disabled — relies on CSP instead) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (production) |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'` |

### Environment Validation
- Zod schema validates all environment variables at startup
- Production mode requires: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Server fails fast with descriptive errors if required secrets are missing

### CORS
- Origin whitelist from `CORS_ORIGINS` or `FRONTEND_URL`
- `credentials: true` enabled for cookie transmission

---

## 7. Third-Party Service Security

### Stripe
- Webhook signature verified via `stripe.webhooks.constructEvent()` with raw request body
- `STRIPE_WEBHOOK_SECRET` required in production
- Invalid signatures return 400 immediately

### Twilio
- Credentials (`ACCOUNT_SID`, `AUTH_TOKEN`, `PHONE_NUMBER`) stored as environment variables
- Required in production via Zod validation

### Resend
- API key used as Bearer token in Authorization header
- Stored as environment variable

### Google OAuth
- PKCE flow with state parameter prevents authorization code interception
- Client secret stored as environment variable, required in production
- Token exchange happens server-side only

---

## 8. Known Accepted Risks

| Risk | Rationale |
|---|---|
| In-memory rate limiting resets on restart | Acceptable for current scale; deploys are infrequent and brief |
| No file content-type validation | MIME type is stored from client metadata but not verified server-side via magic bytes |
| No virus/malware scanning on uploads | Cost/complexity not justified at current scale |
| No audit logging | No centralized log of who-did-what for sensitive operations |
| Phone numbers stored in plaintext | Required for Twilio SMS delivery; masked in API responses |
| `style-src 'unsafe-inline'` in CSP | Required for bundled CSS-in-JS styles; does not affect script execution |
| No CSRF tokens | Relying on `SameSite=Lax` cookies — sufficient for modern browsers but does not protect GET-based state changes |
| Database pool uses library defaults | `postgres` driver defaults (max 10 connections) — adequate at current scale |

---

## 9. Recommendations for Future Hardening

- **Redis-backed rate limiting** — persist rate limit state across deploys to prevent reset-based bypass
- **File type validation** — verify uploaded file content via magic bytes at document registration time
- **Audit logging** — log sensitive operations (login, 2FA toggle, document access, plan changes) with user ID and timestamp
- **Explicit database pool configuration** — set max connections based on Railway plan limits
- **Encrypt phone numbers at rest** — application-layer encryption with a dedicated key, decrypted only when sending SMS
- **Upload scanning** — ClamAV or similar for malware detection on uploaded documents at scale
- **CSRF tokens** — add explicit CSRF protection for state-changing POST/PUT/DELETE operations as defense-in-depth beyond SameSite cookies
