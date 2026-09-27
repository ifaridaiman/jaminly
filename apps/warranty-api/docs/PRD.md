# PRD — Jaminly API (`warranty-api`)

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Owner** | Farid Aiman |
| **Last updated** | 2026-09-26 |
| **Consumer** | `apps/warranty-ui` (Expo: iOS, Android, Web) |
| **Related** | [ARCHITECTURE](./ARCHITECTURE.md) · UI [PRD](../../warranty-ui/docs/PRD.md) · UI [ARCHITECTURE](../../warranty-ui/docs/ARCHITECTURE.md) |

---

## 1. Summary

The backend for Jaminly, the open-source personal warranty vault. It replaces the UI's in-memory mock (`warranty-ui/src/lib/api/mock.ts`) so that the app can run with `EXPO_PUBLIC_USE_MOCK_API=false` and `EXPO_PUBLIC_MOCK_AUTH=false`.

It does five things:
1. Signs users in with email and password (verified by an emailed code) or a Google ID token, and issues Jaminly session tokens.
2. Stores warranties per user (CRUD).
3. Stores proof-of-purchase files privately and hands out short-lived URLs.
4. Sends expiry reminders by push and email, server-side, even when the app is closed.
5. Deletes an account and all its data after an emailed one-time code.

**Definition of done:** every method of the UI's `ApiClient` (current and planned) has a working endpoint, and the UI passes its flows with all mock flags off.

## 2. Goals & Non-goals

### Goals
- Match the UI contract exactly (field names, date formats, error messages the UI can show as-is).
- Private by default: a user can only ever see their own data; receipts never have public URLs.
- Easy to self-host: one Postgres, one S3-compatible bucket, one SMTP account. Runs locally with `docker compose` and no cloud accounts except Google OAuth.

### Non-goals (v1)
- Server-side search/filter/sort. The UI does this on the client (`sortWarranties`, status is derived). Revisit if a user has > 500 warranties.
- OCR, household sharing, PDF export, extended warranties (UI PRD v2).
- Sign-in methods other than Google.
- Admin panel, multi-tenancy, billing.

## 3. What the UI needs today

Source of truth: `warranty-ui/src/lib/api/types.ts`. All paths below are under `/api/v1` (e.g. `GET /api/v1/warranties`); responses use the envelope in §6.

| UI call | Status in UI | Endpoint |
|---|---|---|
| `listWarranties()` | used | `GET /warranties` |
| `getWarranty(id)` | used | `GET /warranties/:id` |
| `createWarranty(input)` | used | `POST /warranties` |
| `updateWarranty(id, input)` | used (sends the **full** input) | `PATCH /warranties/:id` |
| `deleteWarranty(id)` | used | `DELETE /warranties/:id` |
| `requestAccountDeletion()` | used | `POST /me/deletion` |
| `confirmAccountDeletion(code)` | used | `DELETE /me` |
| `register(input)` | used | `POST /auth/register` |
| `verifyEmail(email, code)` / `resendVerification(email)` | used | `POST /auth/verify-email`, `POST /auth/verify-email/resend` |
| `login(email, password)` | used | `POST /auth/login` |
| `forgotPassword(email)` / `resetPassword(email, code, password)` | used | `POST /auth/password/forgot`, `POST /auth/password/reset` |
| `signInWithGoogle(idToken)` | used (mock); real Google SDK at M1 | `POST /auth/google` |
| token refresh | planned (M1) | `POST /auth/refresh` |
| sign out | planned (M1) | `POST /auth/logout` |
| `getMe()` | planned (M1) | `GET /me` |
| `uploadProof(file)` | planned (M2) | `POST /uploads` + `PUT` to signed URL |
| `saveNotificationSettings(s)` | planned (M2, today in-memory `SettingsProvider`) | `GET` / `PUT /me/notification-settings` |
| `registerPushToken(token)` | planned (M2) | `POST /me/push-tokens` |

## 4. Functional Requirements

Priority: **P0** = needed to turn the mock flags off, **P1** = should-have for launch, **P2** = later.

### 4.1 Authentication
| ID | Requirement | Pri |
|---|---|---|
| API-AUTH-1 | One account per email. Emails are trimmed and lower-cased before storing or comparing. An account can have a password, a linked Google identity, or both. | P0 |
| API-AUTH-2 | `POST /auth/register { name, email, password }` (password 8–128) creates an **unverified** account and emails a 6-digit code → 201 `{ email, resendAfterSeconds }`, no tokens. A verified account with that email → 409 `EMAIL_TAKEN`. An unverified one is taken over (new name/password, new code): nobody has proved that inbox yet. | P0 |
| API-AUTH-3 | `POST /auth/verify-email { email, code }` → tokens. `POST /auth/verify-email/resend { email }` always answers the same (doesn't reveal accounts). Codes: 15 min, 5 wrong attempts, 30 s between sends, stored hashed, single use. | P0 |
| API-AUTH-4 | `POST /auth/login { email, password }` → tokens. Unknown email, wrong password and Google-only account all → 401 `INVALID_CREDENTIALS` "Email or password is incorrect.", with the same scrypt cost. Right password on an unverified account → 401 `EMAIL_NOT_VERIFIED` and a fresh code. | P0 |
| API-AUTH-5 | `POST /auth/password/forgot { email }` always answers the same; emails a code if the account exists (Google-only accounts can add a password this way). `POST /auth/password/reset { email, code, password }` sets the password, verifies the email, revokes every refresh token, and returns new tokens. | P0 |
| API-AUTH-6 | `POST /auth/google { idToken }` verifies the token with Google (signature, `aud` ∈ our client IDs, `email_verified`). Matches by Google `sub`, then by email: an existing email/password account gets Google linked; if that account was never verified its password is removed (locks out whoever typed someone else's email). Otherwise creates a verified account. | P0 |
| API-AUTH-7 | Passwords hashed with scrypt (N=2^14, r=8, p=1, 16-byte salt; parameters stored in the hash). Never logged or returned. | P0 |
| API-AUTH-8 | Access token: JWT, 15 min. Refresh token: opaque random, 60 days, stored hashed, **rotated on every use**; reuse of an old refresh token revokes that token family. `POST /auth/refresh`, `POST /auth/logout`. | P0 |
| API-AUTH-9 | Every other endpoint requires `Authorization: Bearer <accessToken>` → 401 otherwise. `GET /me` → `User`. | P0 |
| API-AUTH-10 | `/auth/*` is rate limited to 10/min per IP. | P0 |

### 4.2 Warranties
| ID | Requirement | Pri |
|---|---|---|
| API-WAR-1 | CRUD endpoints scoped to the caller. Another user's id returns **404**, never 403 (don't leak existence). | P0 |
| API-WAR-2 | Response shape is exactly the UI `Warranty` type (§5). `createdAt`/`updatedAt` set by the server. | P0 |
| API-WAR-3 | Validation mirrors `warranty-ui/src/features/warranties/validate.ts`: `productName` non-blank; `purchaseDate` valid `YYYY-MM-DD`; `warrantyMonths` integer 1–600; 1–5 proof attachments; category in the enum. | P0 |
| API-WAR-4 | `expiryDate` is accepted from the client (user may override). If omitted, server computes `purchaseDate + warrantyMonths` with month-end clamping (same rule as UI `addMonths`). Must be ≥ `purchaseDate`. | P0 |
| API-WAR-5 | `proofOfPurchase` in requests is a list of attachment **ids** previously uploaded by the same user (§4.3). Unknown or foreign ids → 422 `ATTACHMENT_NOT_FOUND`. Existing `{ id, … }` objects from a GET are accepted too (UI sends back what it received on edit). | P0 |
| API-WAR-6 | `reminderOffsetsDays`: integers 0–365, max 10, de-duplicated. Empty array = reminders off. Default when omitted: user's `defaultReminders`. | P0 |
| API-WAR-7 | `PATCH` accepts a full or partial body; missing fields are left unchanged. Changing expiry or offsets reschedules reminders. | P0 |
| API-WAR-8 | `DELETE` removes the warranty, its attachments (DB + files) and pending reminders. Idempotent: 204 even if already gone. | P0 |
| API-WAR-9 | `GET /warranties` returns all of the user's warranties, unpaginated, ordered by `expiryDate` asc. | P0 |
| API-WAR-10 | Optional `?status=&category=&q=` filters and cursor pagination. | P2 |
| API-WAR-11 | Soft limits per user on the hosted instance: 1,000 warranties, 500 MB of files → 409 with a clear message. Configurable via env; off when self-hosting. | P1 |

### 4.3 Proof of purchase (uploads)
| ID | Requirement | Pri |
|---|---|---|
| API-UP-1 | `POST /uploads { mimeType, sizeBytes, name? }` → `{ attachment: Attachment, uploadUrl, headers }`. Allowed: `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `application/pdf`; ≤ 10 MB. | P0 |
| API-UP-2 | `uploadUrl` is a presigned `PUT` valid for 10 minutes, bound to the declared content type and length. | P0 |
| API-UP-3 | Files live in a **private** bucket under `users/<userId>/<attachmentId>`. `Attachment.url` in every response is a presigned `GET` valid for 1 hour, generated at read time. Never stored. | P0 |
| API-UP-4 | When a warranty references an attachment, the server `HEAD`s the object to confirm it exists and its size/type match. Missing object → 422 `ATTACHMENT_NOT_UPLOADED`; size/type mismatch → 422 `ATTACHMENT_MISMATCH`. | P0 |
| API-UP-5 | Attachments not linked to a warranty within 24 h are deleted by a cleanup job (abandoned forms). | P1 |
| API-UP-6 | Attachments removed from a warranty on edit are deleted. | P0 |

### 4.4 Reminders & notifications
| ID | Requirement | Pri |
|---|---|---|
| API-NOT-1 | For each warranty, one reminder per offset fires at **09:00 in the user's timezone** on `expiryDate − offset` days. Past dates are skipped. | P0 |
| API-NOT-2 | Channels follow the user's settings: `push` (to all of the user's registered tokens, via the configured push provider) and/or `email`. | P0 |
| API-NOT-3 | Each (warranty, offset, expiryDate) is sent **at most once**, even across restarts or multiple API instances. | P0 |
| API-NOT-4 | Push payload includes `data.url = "jaminly://warranty/<id>"` for the UI's deep link. Title/body: "Samsung TV warranty ends in 7 days" / "…ends today". | P0 |
| API-NOT-5 | Tokens the push provider reports as invalid are deleted. | P1 |
| API-NOT-6 | Email contains product name, expiry date, what's covered, and a link to the web app. Plain text + simple HTML. | P0 |
| API-NOT-7 | `POST /me/push-tokens { token, provider, platform }` (`provider` is `expo` today) is idempotent; the same token moving to another user is reassigned. `DELETE /me/push-tokens/:token` on sign-out. | P0 |
| API-NOT-8 | The push provider is chosen by config (`PUSH_PROVIDER`), not code. Switching from Expo to FCM or another service needs no change outside its adapter. | P0 |

### 4.5 Settings
| ID | Requirement | Pri |
|---|---|---|
| API-SET-1 | `GET` / `PUT /me/notification-settings` with `{ push, email, defaultReminders, timezone }`. Matches UI `Settings` minus `appearance` (device-local). | P0 |
| API-SET-2 | Defaults on account creation: `push: true, email: false, defaultReminders: [30, 7, 0]`, `timezone` from first request, else `UTC`. | P0 |
| API-SET-3 | Changing `defaultReminders` does **not** rewrite existing warranties (they carry their own offsets). | P0 |

### 4.6 Account deletion
| ID | Requirement | Pri |
|---|---|---|
| API-DEL-1 | `POST /me/deletion` emails a 6-digit code → `{ email, resendAfterSeconds: 30 }`. A second call within 30 s → 429 `DELETION_CODE_RECENTLY_SENT` with `errors[0].details.resendAfterSeconds`. | P0 |
| API-DEL-2 | Code valid for 15 min, stored hashed, max 5 wrong attempts then invalidated. The code is **never** returned in a response. | P0 |
| API-DEL-3 | `DELETE /me { code }`: on match, deletes the user and everything they own (warranties, attachments + files, tokens, reminders) in one transaction, files right after. 204. Wrong code → 422 `DELETION_CODE_INVALID`, message `"That code isn't right. Check the email or send a new one."` (the UI shows it as-is). | P0 |

## 5. Data contract

Mirrors `warranty-ui/src/lib/api/types.ts`. Any change there must change here, and vice versa.

```ts
type Category = 'electronics' | 'appliance' | 'furniture' | 'vehicle' | 'other';

type Attachment = { id: string; url: string; mimeType: string; sizeBytes: number; name?: string };

type Warranty = {
  id: string;
  productName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: Category;
  store?: string;
  purchaseDate: string;        // YYYY-MM-DD, a calendar date, no timezone
  price?: { amount: number; currency: string }; // ISO 4217, amount in major units (2999 = RM 2,999)
  warrantyMonths: number;
  expiryDate: string;          // YYYY-MM-DD
  coverage: { covered: string[]; notCovered: string[]; notes?: string };
  proofOfPurchase: Attachment[];
  reminderOffsetsDays: number[];
  createdAt: string;           // ISO 8601 timestamp, UTC
  updatedAt: string;
};

type User = { id: string; email: string; name: string; avatarUrl?: string };

type NotificationSettings = { push: boolean; email: boolean; defaultReminders: number[]; timezone: string };
```

- Status (`active` / `expiring_soon` / `expired`) is **derived in the UI**, never stored or returned.
- Optional fields are **omitted** when empty (not `null`), to match the UI's `?:` types.
- Field limits: text fields ≤ 200 chars, `coverage.notes` ≤ 2,000, each coverage list ≤ 30 items of ≤ 100 chars.

## 6. Responses & Errors

Every JSON response uses one envelope (full spec: [ARCHITECTURE §10](./ARCHITECTURE.md#10-api-response-contract)):

```json
{ "success": true, "code": "WARRANTY_FETCHED", "message": "Warranty retrieved.", "data": { }, "errors": [],
  "meta": { "requestId": "req_…", "timestamp": "2026-09-26T18:10:00.000Z", "version": "v1" } }
```

- `data` is exactly the §5 type; on errors it is `null`.
- `message` is a sentence the UI can show as-is. `code` is stable and machine-readable (`SCREAMING_SNAKE_CASE`).
- Validation errors list one entry per field in `errors[]` with a dotted `field` path, so the form can show each under its input.
- 204 responses have no body. Every response carries `x-request-id`.

| Status | Default code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON |
| 401 | `UNAUTHORIZED` | Missing/expired access token (UI refreshes once, then signs out) |
| 404 | `RESOURCE_NOT_FOUND` / `WARRANTY_NOT_FOUND` … | Not found **or** not yours |
| 409 | `WARRANTY_LIMIT_REACHED`, `STORAGE_LIMIT_REACHED` | Per-user limit reached |
| 422 | `VALIDATION_ERROR`, `DELETION_CODE_INVALID`, `ATTACHMENT_MISMATCH` … | Invalid fields, broken business rule, wrong deletion code |
| 429 | `RATE_LIMITED`, `DELETION_CODE_RECENTLY_SENT` | Rate limited, deletion code resend too soon |
| 5xx | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` | Our bug or a provider outage. Generic message with the request id; details only in logs. |

## 7. Non-functional Requirements

- **Security & privacy:** HTTPS only in production. Receipts may hold addresses and partial card numbers: private bucket, server-side encryption, signed URLs only. Refresh tokens and deletion codes stored hashed. No PII in logs (log user ids, not emails). PDPA (Malaysia) / GDPR: full deletion on request (§4.6).
- **Rate limits:** 100 req/min per user; `/auth/*` 10/min per IP; `/me/deletion` 3/hour per user.
- **CORS:** allow the web app's origin(s) from `CORS_ORIGINS` (dev: `http://localhost:8081`).
- **Performance:** `GET /warranties` < 300 ms p95 for 200 warranties including URL signing (signing is local, no network call).
- **Reliability:** reminders are delivered within 1 hour of 09:00 local time; a missed run (server down) catches up on the next run for reminders due in the last 24 h.
- **Self-hosting:** all config via env vars, `.env.example` committed, `docker compose up` brings up Postgres + RustFS (S3-compatible) + MailHog. Migrations run on start.
- **Observability:** structured JSON logs, `GET /health` (DB reachable) for load balancers.

## 8. Milestones (aligned with UI PRD)

| Phase | API scope | UI flag flipped |
|---|---|---|
| **M1 — Real auth** | Project setup (DB, config, errors), Google exchange, JWT + refresh, `GET /me`, account deletion with email code, `/health`. | `EXPO_PUBLIC_MOCK_AUTH=false` |
| **M2 — API** | Warranties CRUD, uploads + signed URLs, notification settings, push tokens, reminder scheduler (push + email), attachment cleanup. | `EXPO_PUBLIC_USE_MOCK_API=false`, `EXPO_PUBLIC_LOCAL_REMINDERS=false` |
| **M3 — OSS release** | `docker-compose.yml`, `.env.example`, self-hosting guide in README, CI (lint, typecheck, test, e2e). | — |
| **M4 — Launch** | Production deploy, backups, rate limits tuned, privacy policy data-flow review. | — |

## 9. Changes needed in the UI

Small gaps found while writing this. None block M1.

1. `ApiClient` has the auth calls; still needs `refresh`, `getMe`, `uploadProof`, `getNotificationSettings` / `saveNotificationSettings`, `registerPushToken` (already listed in UI ARCHITECTURE §4.1, not yet in `types.ts`).
2. `WarrantyForm` must call `uploadProof` for each **new** local file on save and send the returned attachment ids. Already-uploaded attachments pass through unchanged.
3. `SettingsProvider` should send `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`) with notification settings.
4. `http.ts` unwraps `data` from the envelope (§6) and, on failure, throws an `ApiError { status, code, message, errors, requestId }`. `message` keeps screens showing server text the way they show mock errors; `errors[].field` maps onto `WarrantyErrors`; `code` is for branching (e.g. `UNAUTHORIZED` → refresh).

## 10. Open Questions

1. **Email provider** for the hosted instance: SMTP to Resend / SES / Postmark? (Self-hosters bring any SMTP.)
2. **Hosting** for the official instance: Fly.io / Railway / a VPS? Affects bucket choice (R2 vs S3).
3. **HEIC:** store as-is, or convert to JPEG so the web app can display it? (Browsers other than Safari can't render HEIC.)
4. **Web session:** keep bearer tokens in `localStorage` or move to http-only cookies (needs same-site deployment)?
5. **Hosted limits** in API-WAR-11: are 1,000 warranties / 500 MB the right numbers?
