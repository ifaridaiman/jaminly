# Jaminly API — Architecture

Status: Draft v0.1 · Last updated 2026-09-26 · Related: [PRD](./PRD.md), UI [ARCHITECTURE](../../warranty-ui/docs/ARCHITECTURE.md)

NestJS 11 on Node 22, PostgreSQL, an S3-compatible bucket, SMTP, and a pluggable push provider (Expo Push by default). This doc explains how the code is laid out, how data moves, and the rules that keep it small.

---

## 1. Principles

1. **The UI contract wins.** `warranty-ui/src/lib/api/types.ts` defines the wire format. The API adapts to it, not the other way round.
2. **Postgres does the hard parts.** Ownership filters, uniqueness, cascading deletes, "send once" locking: use constraints and transactions, not app code.
3. **One process.** HTTP and the reminder job run in the same Nest app. No queue, no worker service, no Redis until measured load needs it.
4. **Few dependencies.** Nest's own packages first; add a library only when it saves real work (§11).
5. **Runs on a fresh clone.** `docker compose up` gives Postgres, RustFS (S3), MailHog with no cloud accounts. Email/password needs nothing else; Google sign-in needs your own client IDs.

## 2. System Overview

```
 Expo app (iOS/Android/Web)
        │  HTTPS, Bearer JWT
        ▼
 ┌──────────────── warranty-api (NestJS) ────────────────┐
 │ auth · users · warranties · attachments · notifications│
 │ ValidationPipe · JwtGuard · Throttler · ExceptionFilter│
 └──┬───────────┬──────────────┬──────────────┬──────────┘
    │           │              │              │
 Postgres   S3 / R2 / RustFS  SMTP        PushSender → Expo | FCM | log
 (Prisma)   (private bucket)  (nodemailer) (fetch)
    ▲           ▲
    │           └── app PUTs/GETs files directly via presigned URLs
 Google (ID token verification, JWKS cached by google-auth-library)
```

The app never streams file bytes through the API. It asks for a presigned URL, uploads straight to the bucket, then references the attachment id.

## 3. Modules

Every feature lives in `src/modules/<name>/` as a self-contained Nest module. Services shared by features (`prisma`, `storage`, `mail`, `push`) live in `src/infrastructure/<name>/` as their own Nest modules, each wrapping one external system. `src/common/` holds only framework glue (filters, and decorators once more than one feature needs them). A module owns its controller, service, DTOs, pure helpers and tests. Modules are combined by **what they use**: each `*.module.ts` imports only the modules it needs, and `app.module.ts` just lists the feature modules.

### 3.1 Folder structure

```
src/
  main.ts                           # create app, logger, listen
  app.setup.ts                      # prefix, versioning, pipe, CORS, middleware, Swagger (shared with e2e tests)
  app.module.ts                     # imports feature modules only
  env.ts                            # reads + validates process.env once (loads .env if present), exports typed `env`
  generated/prisma/                 # Prisma client output; git-ignored, built by `prisma generate`
  common/                           # framework glue, no feature or vendor knowledge (§10.12)
    api-response/                   # envelope types, builder, interceptor, @ApiResult
    errors/                         # AppError classes, status map, codes, global filter
    pagination/                     # PageQueryDto, Paginated<T> (added with API-WAR-10)
    request-context/                # AsyncLocalStorage: requestId, userId; access log
    decorators/                     # @Public(), @UserId() (used by every feature)

  infrastructure/                   # one folder per external system; no endpoints, no business rules
    prisma/
      prisma.module.ts              # @Global, exports PrismaService
      prisma.service.ts
    storage/
      storage.module.ts             # exports StorageService
      storage.service.ts            # deletePrefix now; presign PUT/GET + HEAD with attachments (M2)
    google/
      google.module.ts              # exports GoogleVerifierService
      google-verifier.service.ts    # google-auth-library; verify(idToken) → profile | null
    mail/
      mail.module.ts                # exports MailService
      mail.service.ts               # nodemailer; send(to, subject, text, html)
    push/
      push.module.ts                # exports PUSH_SENDER, picks adapter from env.PUSH_PROVIDER
      push-sender.ts                # PushSender interface + PUSH_SENDER token
      expo.sender.ts                # Expo Push via fetch (default)
      log.sender.ts                 # prints instead of sending

  modules/                          # features: own endpoints and tables
    auth/                           # /auth/register, verify-email(/resend), login, password/forgot|reset, google, refresh, logout
      auth.module.ts                # registers JwtGuard as APP_GUARD
      auth.controller.ts
      auth.service.ts
      auth.dto.ts
      auth.codes.ts
      jwt.guard.ts                  # sets userId in the request context
    users/                          # GET /me, POST /me/deletion, DELETE /me
      users.module.ts
      users.controller.ts
      users.service.ts
      email-codes.service.ts        # emailed 6-digit codes: verify email, reset password, delete account
      password.ts                   # scrypt hash/verify (node:crypto)      ← pure, tested
      deletion.service.ts           # delete account after the code
      users.dto.ts
      users.codes.ts
      index.ts                      # public surface: UsersModule, UsersService, UserDto
    warranties/                     # /warranties CRUD
      warranties.module.ts
      warranties.controller.ts
      warranties.service.ts
      warranty.dto.ts
      to-response.ts                # DB row → UI Warranty shape
      expiry.ts                     # addMonths()                         ← pure, tested
      expiry.spec.ts
    attachments/                    # POST /uploads
      attachments.module.ts         # exports AttachmentsService
      attachments.controller.ts
      attachments.service.ts        # create + presign, link to warranty, sign URLs, cleanup cron
    notifications/                  # /me/notification-settings, /me/push-tokens, reminder crons
      notifications.module.ts       # exports RemindersService
      settings.controller.ts
      push-tokens.controller.ts
      reminders.service.ts          # plan(warranty) + @Cron send
      schedule.ts                   # (expiry, offsets, tz) → sendAt[]     ← pure, tested
      schedule.spec.ts
    health/                         # GET /health
      health.module.ts
      health.controller.ts

prisma/
  schema/                           # multi-file schema, one file per owning module
    base.prisma                     # generator + datasource
    auth.prisma                     # RefreshToken
    users.prisma                    # User, EmailCode
    warranties.prisma               # Warranty, Category
    attachments.prisma              # Attachment
    notifications.prisma            # Reminder, PushToken
  migrations/
prisma.config.ts                    # Prisma 7 CLI config: schema folder, migrations, DATABASE_URL
test/
  *.e2e-spec.ts                     # supertest against a real Postgres
```

### 3.2 How modules combine

```
                        app.module
                            │
  modules/   auth   users   warranties ──► attachments   notifications   health
                      │          └────────────────────────────►│
                      │                          │             │
  infrastructure/   mail, storage             storage     push, mail
                            │
                  prisma (@Global, used by every feature)
```

| Module | Location | Imports | Exports | Used by |
|---|---|---|---|---|
| `prisma` | `infrastructure/` | — | `PrismaService` (global) | all features |
| `storage` | `infrastructure/` | — | `StorageService` | `attachments`, `users` |
| `mail` | `infrastructure/` | — | `MailService` | `users`, `notifications` |
| `push` | `infrastructure/` | — | `PUSH_SENDER` | `notifications` |
| `google` | `infrastructure/` | — | `GoogleVerifierService` | `auth` |
| `auth` | `modules/` | `JwtModule`, `google`, `users` | — (guard is global) | — |
| `users` | `modules/` | `mail`, `storage` | `UsersService` | `auth` |
| `attachments` | `modules/` | `storage` | `AttachmentsService` | `warranties` |
| `notifications` | `modules/` | `push`, `mail` | `RemindersService` | `warranties` |
| `warranties` | `modules/` | `attachments`, `notifications` | — | — |
| `health` | `modules/` | — | — | — |

Swapping an `infrastructure/` module (another mail transport, another push provider, another object store) only touches that module. Feature code sees the exported service, never the SDK.

### 3.3 Rules

- **Import through the module, not the file.** A module may only use what another module lists in `exports`. Import another feature module only through its `index.ts` (e.g. `../users`), never its internal files (`../warranties/to-response`).
- **Dependencies point one way:** `modules/` → `infrastructure/` and `common/`, and `warranties` → `attachments` / `notifications`. No cycles and no `forwardRef`. `infrastructure/` and `common/` never import from `modules/`. If two features need the same external system, it gets an `infrastructure/` module.
- **A module writes only its own tables** (see `prisma/schema/<module>.prisma`). It may read other tables with Prisma for joins; changes go through the owner's service. Exception: `onDelete: Cascade` in the DB.
- **`infrastructure/` modules have no controllers** and no business rules.
- **Vendor SDKs only in `infrastructure/`.** `@prisma/client` (runtime), `@aws-sdk/*`, `nodemailer` and vendor `fetch` calls stay there. Enforced with ESLint `no-restricted-imports` on `src/modules/**` and `src/common/**` (type-only Prisma imports allowed).
- Controllers are thin: validate, call the service, return.
- **No repository classes.** Services use Prisma directly; Prisma is already the repository.
- **No interfaces with one implementation.** `StorageService` talks to S3's API; RustFS/R2/S3 are the same API, so there's nothing to abstract. `PushSender` is the exception because it has several adapters.
- Every query on user data includes `userId` in the `where`. Enforced in review and by e2e tests (§12).
- A new feature = a new folder under `modules/`, its `.prisma` file, and one line in `app.module.ts`.

## 4. Data Model

Shown as one listing for reading; in the repo each model lives in its owning module's file under `prisma/schema/` (multi-file schema).

**Prisma 7 specifics:** the client connects through the `@prisma/adapter-pg` driver adapter (no Rust engine). The `prisma-client` generator writes TypeScript into `src/generated/prisma` with `moduleFormat = "cjs"` and extensionless imports to match this CommonJS Nest build. `PrismaService` in `infrastructure/prisma` is the only runtime importer of it; modules may import its types.

```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique           // trimmed + lower-cased
  emailVerifiedAt  DateTime?                   // null = password sign-up waiting for its code
  passwordHash     String?                     // scrypt; null = Google-only
  googleSub        String?   @unique           // null = email/password-only
  name             String
  avatarUrl        String?
  pushEnabled      Boolean  @default(true)
  emailEnabled     Boolean  @default(false)
  defaultReminders Int[]    @default([30, 7, 0])
  timezone         String   @default("UTC")      // IANA, e.g. Asia/Kuala_Lumpur
  createdAt        DateTime @default(now())
  warranties    Warranty[]
  attachments   Attachment[]
  refreshTokens RefreshToken[]
  pushTokens    PushToken[]
  emailCodes    EmailCode[]
}

model Warranty {
  id                  String   @id @default(uuid())
  userId              String
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productName         String
  brand               String?
  model               String?
  serialNumber        String?
  category            Category
  store               String?
  purchaseDate        DateTime @db.Date
  priceAmount         Decimal? @db.Decimal(12, 2)
  priceCurrency       String?  @db.Char(3)
  warrantyMonths      Int
  expiryDate          DateTime @db.Date
  covered             String[]
  notCovered          String[]
  coverageNotes       String?
  reminderOffsetsDays Int[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  attachments Attachment[]
  reminders   Reminder[]
  @@index([userId, expiryDate])
}

model Attachment {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  warrantyId String?                         // null until linked; cleanup deletes stale nulls
  warranty   Warranty? @relation(fields: [warrantyId], references: [id], onDelete: Cascade)
  key        String    @unique               // users/<userId>/<id>
  mimeType   String
  sizeBytes  Int
  name       String?
  createdAt  DateTime  @default(now())
}

model Reminder {
  id         String    @id @default(uuid())
  warrantyId String
  warranty   Warranty  @relation(fields: [warrantyId], references: [id], onDelete: Cascade)
  offsetDays Int
  expiryDate DateTime  @db.Date              // part of the key: a new expiry means new reminders
  sendAt     DateTime                        // 09:00 user-local, stored as UTC instant
  sentAt     DateTime?
  @@unique([warrantyId, offsetDays, expiryDate])
  @@index([sentAt, sendAt])
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  family    String                           // rotation chain; reuse revokes the family
  tokenHash String    @unique                // sha256
  expiresAt DateTime
  revokedAt DateTime?
}

model PushToken {
  token    String @id                        // opaque; format belongs to the provider
  provider String                            // expo | fcm | … ; only rows matching PUSH_PROVIDER are sent
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform String                            // ios | android
}

enum EmailCodePurpose { VERIFY_EMAIL RESET_PASSWORD DELETE_ACCOUNT }

model EmailCode {                              // one live code per (user, purpose)
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose   EmailCodePurpose
  codeHash  String                             // sha256
  attempts  Int              @default(0)
  expiresAt DateTime
  sentAt    DateTime
  @@id([userId, purpose])
}

enum Category { electronics appliance furniture vehicle other }
```

Notes:
- Coverage, price and offsets are **columns/arrays on the warranty**, not child tables. They're only ever read with the warranty.
- `@db.Date` columns are serialised as `YYYY-MM-DD` strings with no timezone conversion. Never turn them into `Date` objects with a local offset.
- `onDelete: Cascade` makes account and warranty deletion a single `DELETE` in the DB. Files are deleted separately (§6).
- `to-response.ts` maps `priceAmount/priceCurrency` → `price`, `covered/notCovered/coverageNotes` → `coverage`, drops `null`s, and signs attachment URLs.

## 5. Authentication

Two ways in, one account per email, same tokens out.

```
Email/password
App ── POST /auth/register {name,email,password} ─► create unverified User, email code ─► 201 {email}
App ── POST /auth/verify-email {email,code} ─────► mark verified ─► tokens
App ── POST /auth/login {email,password} ────────► scrypt verify ─► tokens | 401 INVALID_CREDENTIALS | 401 EMAIL_NOT_VERIFIED (+ new code)
App ── POST /auth/password/forgot {email} ───────► email code (if the account exists; same answer either way)
App ── POST /auth/password/reset {email,code,password} ─► new hash, verify email, revoke all refresh tokens ─► tokens

Google
App ──(Google Sign-In)──► Google ─► idToken
App ── POST /auth/google {idToken} ─► verifyIdToken(aud = GOOGLE_CLIENT_IDS[], email_verified)
        find by googleSub → else by email (link) → else create
        ◄── { accessToken (JWT 15m), refreshToken (random 32B, 60d), user }

App ── any request, Authorization: Bearer <accessToken>
   401 ─► POST /auth/refresh {refreshToken} ─► rotate: revoke old, issue new (same family)
```

**Account linking** (`UsersService.upsertFromGoogle`, `registerWithPassword`):

| Situation | Result |
|---|---|
| Google sign-in, `sub` known | Same user; name/avatar refreshed. Email is not changed. |
| Google sign-in, email matches a **verified** password account | Google linked to it; password keeps working. |
| Google sign-in, email matches an **unverified** password account | Google linked, email marked verified, **password removed** (whoever typed that email never proved it). |
| Register, email has a verified account (password or Google) | 409 `EMAIL_TAKEN`. A Google-only user adds a password through forgot-password. |
| Register, email has an unverified account | Taken over: new name and password, new code. |

**Passwords** (`modules/users/password.ts`): `node:crypto` scrypt, N=2^14, r=8, p=1, 64-byte key, 16-byte salt, stored as `scrypt$N$r$p$salt$hash` so parameters can be raised later. Login for an unknown email runs scrypt against a dummy hash so timing doesn't reveal accounts. 8–128 characters (the cap keeps scrypt cheap). No bcrypt/argon2 dependency.

**Emailed codes** (`modules/users/email-codes.service.ts`, shared by verify-email, reset-password and account deletion): 6 digits from `crypto.randomInt`, stored as sha256, 15-minute expiry, 5 wrong attempts then dead, 30 s between sends, deleted on success, spaces ignored. On public endpoints an unknown email fails exactly like a wrong code. Deletion keeps its own error codes (`DELETION_CODE_*`); the others use `CODE_INVALID` / `CODE_EXPIRED`.

- `google-auth-library` `OAuth2Client.verifyIdToken` with all client IDs (iOS, Android, Web) as the audience list. It caches Google's JWKS. Empty `GOOGLE_CLIENT_IDS` → `/auth/google` returns 503; email/password is unaffected.
- Access token claims: `{ sub: userId }`, HS256 with `JWT_SECRET`. No roles, no email in the token.
- A global `JwtGuard` (`APP_GUARD`) protects everything; `@Public()` marks `/auth/*` and `/health`.
- Refresh reuse detection: if a revoked token is presented, revoke every token in its `family` (stolen token defence).
- `DELETE /me` and sign-out revoke all refresh tokens and push tokens for that user.

## 6. Proof-of-purchase Files

```
1. App  POST /uploads {mimeType, sizeBytes, name}
2. API  validate type/size → insert Attachment(warrantyId=null)
        → presigned PUT (10 min, Content-Type + Content-Length bound)
        ◄ { attachment, uploadUrl, headers }
3. App  PUT file bytes → bucket
4. App  POST /warranties { …, proofOfPurchase: [{id}, …] }
5. API  in a transaction: check each id is this user's and unlinked (or already on this warranty),
        HEAD object (exists, size/type match), set warrantyId
6. Reads: attachment.url = presigned GET (1 h), signed locally per request
```

- The S3 clients set `requestChecksumCalculation: 'WHEN_REQUIRED'`. Otherwise recent AWS SDKs sign a CRC32 of the (empty) body into presigned PUT URLs, which S3/R2 then enforce against the real file and reject. An e2e test asserts upload URLs carry no `x-amz-checksum`.
- Browsers upload straight to the bucket, so it needs CORS for the web app's origins (`PUT`, `GET`, `HEAD`). `docker compose` sets it for `http://localhost:8081` and `:8082` in `rustfs-init`; production buckets need the same rule for the real web origin.
- Bucket is private with SSE on. Keys are `users/<userId>/<attachmentId>`, so a user's data can be listed and deleted by prefix.
- Deleting files: after the DB transaction commits, `DeleteObjects` for the removed keys. If that fails, the hourly cleanup (§7) catches it by listing the user prefix against the DB. A stray file costs cents; a DB row pointing to a missing file breaks the UI, so the DB goes first.
- HEIC: stored as-is for v1 (PRD open question 3).

## 7. Reminders

Reminders are **materialised rows**, one per (warranty, offset, expiry date), so "send once" is a DB fact rather than a calculation.

**Planning** (`RemindersService.plan(warrantyId)`), called in the same transaction as warranty create/update, and for all of a user's warranties when their timezone changes:
1. Delete that warranty's unsent `Reminder` rows.
2. For each offset: `sendAt = 09:00 on (expiryDate − offset)` in the user's timezone, converted to UTC (`Intl` for the offset, no date library). Skip if in the past.
3. Insert rows with `skipDuplicates`; `@@unique([warrantyId, offsetDays, expiryDate])` means an already-sent reminder is never re-created by a later save, while a changed expiry date gets fresh ones.

**Sending** (`@Cron('*/15 * * * *')`, `@nestjs/schedule`):
```sql
UPDATE "Reminder" SET "sentAt" = now()
WHERE id IN (SELECT id FROM "Reminder"
             WHERE "sentAt" IS NULL AND "sendAt" <= now()
             ORDER BY "sendAt" LIMIT 500 FOR UPDATE SKIP LOCKED)
RETURNING id, "warrantyId", "offsetDays", "sendAt"
```
- **Claim, then send**: one statement marks the batch sent and returns it, so two instances (or two overlapping runs) can never both send a reminder. A crash mid-send loses that reminder rather than doubling it. Batches repeat until fewer than 500 come back.
- Claimed reminders more than 24 h late (downtime catch-up window) are dropped without sending: a stale "7 days left" is worse than none.
- Per reminder: push to every `PushToken` of the user if `pushEnabled`; email if `emailEnabled`. A send failure is logged; the reminder is still marked sent (no retry storms). ponytail: no retries; add a `attempts` column if delivery failures show up in logs.
- Push goes through `PushSender` (below). Tokens it reports as invalid are deleted.

### Push providers

The reminder code never knows which push service is used. It depends only on this port:

```ts
// infrastructure/push/push-sender.ts
export type PushMessage = { token: string; title: string; body: string; url: string }; // url = jaminly://warranty/<id>
export interface PushSender {
  send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }>;
}
export const PUSH_SENDER = Symbol('PushSender');
```

```ts
// infrastructure/push/push.module.ts — the only place that reads PUSH_PROVIDER
{ provide: PUSH_SENDER, useClass: { expo: ExpoSender, log: LogSender }[env.PUSH_PROVIDER] }
```

| `PUSH_PROVIDER` | Adapter | Notes |
|---|---|---|
| `expo` (default) | `expo.sender.ts` | `fetch` to `https://exp.host/--/api/v2/push/send`, batches of 100, `data.url` for the deep link. `DeviceNotRegistered` → invalid. Optional `EXPO_ACCESS_TOKEN` if push security is enabled on the Expo project. |
| `log` | `log.sender.ts` | Logs each message, sends nothing. Default in tests. |
| `fcm` | not built | Add `fcm.sender.ts` (`firebase-admin`) only if the app leaves Expo. `UNREGISTERED` → invalid. |

- Tokens are stored as opaque strings with a `provider` column. `POST /me/push-tokens { token, provider, platform }`; the app sends `provider: 'expo'` today.
- The cron sends only tokens whose `provider` matches `PUSH_PROVIDER`. Switching provider = change the env var; devices re-register on next launch, old rows are cleaned up as they fail or on sign-out.
- Adding a provider = one new adapter file + one entry in the map. Nothing else changes.

**Cleanup** (hourly `@Cron` in each owning module, so no module deletes another's rows): `attachments` removes unlinked attachments older than 24 h (row + file), `users` removes expired email codes and never-verified accounts older than 7 days, `auth` removes expired refresh tokens.

## 8. Account Deletion

1. `POST /me/deletion`: through `EmailCodesService` (§5). If the last `DELETE_ACCOUNT` code was sent < 30 s ago → 429 `DELETION_CODE_RECENTLY_SENT` with `details.resendAfterSeconds`. Else generate a 6-digit code with `crypto.randomInt`, store `sha256(code)`, `expiresAt = now + 15 min`, `attempts = 0`, email it. Return `{ email, resendAfterSeconds: 30 }`.
2. `DELETE /me { code }`: load the row; if missing, expired or `attempts >= 5` → 422 `DELETION_CODE_EXPIRED`. Compare with `crypto.timingSafeEqual`; on mismatch increment `attempts` → 422 `DELETION_CODE_INVALID` with the UI's exact message.
3. On match: collect the user's file keys, `DELETE FROM "User"` (cascade removes everything), commit, then delete the `users/<userId>/` prefix from the bucket.

## 9. Cross-cutting

| Concern | How |
|---|---|
| Config | `src/env.ts` reads `process.env` once at start-up and throws on anything missing. No `@nestjs/config`. |
| Validation | Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` with class-validator DTOs and the §10.5 `exceptionFactory`. Unknown fields → 422 `UNKNOWN_FIELD`. |
| Responses & errors | One envelope for every response, one global interceptor and one global filter. See §10. |
| Rate limiting | `@nestjs/throttler`: 100/min default, stricter on `/auth/*` and `/me/deletion` (PRD §7). In-memory store; switch to Redis only when running > 1 instance. |
| CORS | `app.enableCors({ origin: env.CORS_ORIGINS })`. Native apps don't send `Origin`, so this only affects web. |
| Logging | Nest `Logger` with JSON output in production; request id and access log per §10.7 and §10.9. |
| Health | `GET /health` runs `SELECT 1`. |
| API docs | Swagger UI at `/docs`, OpenAPI JSON at `/docs-json`. On unless `NODE_ENV=production` (force with `SWAGGER=true`). The `@nestjs/swagger` CLI plugin reads `*.dto.ts` classes and their JSDoc, so DTOs need no `@ApiProperty`. It is **off for controllers**: it can't see `@ApiResult` and would inject wrong default statuses and un-enveloped types. Route summaries go in `@ApiResult({ summary })`. "Authorize" takes a Bearer token and applies it to every call; `@Public()` routes ignore it. |
| Shutdown | `app.enableShutdownHooks()` so crons stop and Prisma disconnects cleanly. |

### Environment variables

| Var | Example | Notes |
|---|---|---|
| `PORT` | `3001` | root `pnpm dev` already sets this |
| `DATABASE_URL` | `postgresql://jaminly:jaminly@localhost:5432/jaminly` | |
| `JWT_SECRET` | 32+ random bytes | secret |
| `GOOGLE_CLIENT_IDS` | `ios-id,android-id,web-id` | comma-separated audiences; empty → `/auth/google` returns 503 `GOOGLE_NOT_CONFIGURED` |
| `S3_ENDPOINT` | `http://localhost:9000` | empty for AWS |
| `S3_REGION` / `S3_BUCKET` | `auto` / `jaminly-receipts` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | | secret |
| `SMTP_URL` | `smtp://localhost:1025` | MailHog in dev |
| `MAIL_FROM` | `Jaminly <no-reply@jaminly.app>` | |
| `WEB_APP_URL` | `http://localhost:8081` | links in emails |
| `S3_PUBLIC_ENDPOINT` | empty | host devices use for presigned URLs (LAN IP in dev on a phone, public bucket endpoint in production); empty = `S3_ENDPOINT` |
| `CORS_ORIGINS` | `http://localhost:8081` | comma-separated |
| `PUSH_PROVIDER` | `expo` | `expo` \| `log`; see §7 |
| `EXPO_ACCESS_TOKEN` | empty | only if Expo push security is on; secret |
| `SWAGGER` | empty | `true` to serve `/docs` in production |
| `TRUST_REQUEST_ID` | empty | `true` only behind a gateway that sets `x-request-id` (§10.7) |
| `USER_WARRANTY_LIMIT` / `USER_STORAGE_LIMIT_MB` | empty | empty = no limit (self-host) |

`.env.example` is committed with dev values; `.env` is git-ignored.

## 10. API Response Contract

Every JSON response, success or error, from every module has the same envelope. Controllers never build it; modules never invent their own shape. Everything below lives in `src/common/` because it is framework glue shared by all modules, with no vendor SDKs.

### 10.1 Envelope

```json
{
  "success": true,
  "code": "WARRANTY_FETCHED",
  "message": "Warranty retrieved.",
  "data": { "id": "…", "productName": "Samsung 55\" QLED TV" },
  "errors": [],
  "meta": { "requestId": "req_5f0c…", "timestamp": "2026-09-26T18:10:00.000Z", "version": "v1" }
}
```

```json
{
  "success": false,
  "code": "WARRANTY_NOT_FOUND",
  "message": "Warranty not found.",
  "data": null,
  "errors": [],
  "meta": { "requestId": "req_5f0c…", "timestamp": "2026-09-26T18:10:00.000Z", "version": "v1" }
}
```

- `data` is exactly the UI type (`Warranty`, `Warranty[]`, `User`, …) from PRD §5. The envelope wraps the contract; it never changes it.
- `message` is a sentence the UI can show to the user as-is. `code` is what the UI branches on.
- `meta.timestamp` is ISO 8601 UTC (`toISOString()`), never server-local time.
- **204 No Content** (`DELETE /warranties/:id`, `DELETE /me`, `POST /auth/logout`) has no body, so no envelope. The `x-request-id` header is still set.
- The HTTP status always matches the outcome. `success: false` is never sent with a 2xx.

### 10.2 Types

```ts
// common/api-response/api-response.types.ts
export interface ApiMeta {
  requestId: string;
  timestamp: string;          // ISO 8601 UTC
  version: string;            // "v1"
  pagination?: PaginationMeta;
}

export interface ApiError {
  field?: string;             // dotted path: "coverage.covered[2]", "proofOfPurchase[0].id"
  code: string;               // SCREAMING_SNAKE_CASE
  message: string;
  details?: Record<string, unknown>; // safe, client-facing extras only, e.g. { resendAfterSeconds: 30 }
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  errors: ApiError[];
  meta: ApiMeta;
}
```

`ApiResponse<Warranty>`, `ApiResponse<Warranty[]>`, `ApiResponse<User>` all work through the generic. A paginated list is `ApiResponse<T[]>` with `meta.pagination` set (§10.6).

### 10.3 Controllers: return data, declare the code

Controllers return plain data. A `@ApiResult` decorator declares the success code, message and status. A global `ApiResponseInterceptor` wraps the return value using the builder. The same decorator writes the Swagger schema, so docs and runtime cannot drift.

```ts
@Get(':id')
@ApiResult({ code: 'WARRANTY_FETCHED', message: 'Warranty retrieved.', type: WarrantyDto })
@ApiErrors(404)
findOne(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
  return this.warranties.findOne(userId, id); // → Warranty; throws NotFoundError
}

@Post()
@ApiResult({ code: 'WARRANTY_CREATED', message: 'Warranty saved.', type: WarrantyDto, status: 201 })
@ApiErrors(409, 422)
create(@UserId() userId: string, @Body() dto: CreateWarrantyDto) {
  return this.warranties.create(userId, dto);
}
```

- The builder (`common/api-response/api-response.builder.ts`) has `success({ code, message, data, pagination? })` and `failure({ code, message, errors })`. It fills `success`, `errors: []`, and `meta` from the request context. The interceptor and the exception filter are its only callers; a controller never calls it and never returns `{ success, … }` itself.
- A handler without `@ApiResult` fails a unit test that walks all controllers, so every endpoint has a stable code.
- Not done: returning `{ status: 200, result, msg }`, `res.json(...)`, or `@Res()` in controllers.

### 10.4 Errors

Services throw typed errors and never touch HTTP. One global `AllExceptionsFilter` turns anything thrown into the error envelope.

```ts
// common/errors/app-error.ts
export abstract class AppError extends Error {
  abstract readonly kind: ErrorKind;
  constructor(readonly code: string, message: string, readonly errors: ApiError[] = []) { super(message); }
}
export class NotFoundError extends AppError { readonly kind = 'NOT_FOUND' }
// … one line each for the other kinds

// modules/warranties/warranties.service.ts
if (!row) throw new NotFoundError('WARRANTY_NOT_FOUND', 'Warranty not found.');
```

Kinds and their HTTP status are one table, `ERROR_STATUS` in `common/errors/error-status.ts`. Changing a mapping is a one-line edit there.

| Error class | HTTP | Default code | Used for |
|---|---|---|---|
| `ValidationError` | 422 | `VALIDATION_ERROR` | DTO validation (§10.5), bad attachment ids, bad deletion code |
| `BadRequestError` | 400 | `BAD_REQUEST` | Malformed JSON, wrong content type |
| `AuthenticationError` | 401 | `UNAUTHORIZED` | Missing/expired token, invalid Google token |
| `AuthorizationError` | 403 | `FORBIDDEN` | Reserved; ownership misses are 404 (PRD API-WAR-1) |
| `NotFoundError` | 404 | `RESOURCE_NOT_FOUND` | Unknown id or not the caller's; unknown route |
| `ConflictError` | 409 | `CONFLICT` | Unique violations, per-user limits |
| `BusinessRuleError` | 422 | `BUSINESS_RULE_VIOLATION` | Valid input that breaks a rule (expiry before purchase) |
| `RateLimitError` | 429 | `RATE_LIMITED` | Throttler, deletion code resend |
| `ExternalServiceError` | 502 | `SERVICE_UNAVAILABLE` | S3, SMTP, Google, push provider failed |
| `ServiceUnavailableError` | 503 | `SERVICE_UNAVAILABLE` | Our own dependency is down (`/health` when the DB is unreachable) |
| `DatabaseError` | 500 | `INTERNAL_ERROR` | Unexpected Prisma errors |
| `InternalServerError` | 500 | `INTERNAL_ERROR` | Anything else |

How the filter maps what it catches:
- `AppError` → its kind's status, its code, message and `errors`.
- Nest `HttpException` (throttler, unmatched route, `ParseUUIDPipe`) → by status to the default code above.
- Prisma `P2025` → 404 `RESOURCE_NOT_FOUND`; `P2002` → 409 `CONFLICT`; any other Prisma error → `DatabaseError`.
- Anything else → 500 `INTERNAL_ERROR`.
- For every 5xx the client gets a fixed message: *"Something went wrong. Please try again. Reference: req_…"*. The real error, stack and Prisma meta go only to the log, with the request id.

**Codes** are stable once shipped, `SCREAMING_SNAKE_CASE`, and never reused for a different meaning. Shared codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`, …) live in `common/errors/error-codes.ts`. Module codes live in the module (`modules/warranties/warranty.codes.ts`), keeping modules self-contained.

| Module | Success codes | Error codes |
|---|---|---|
| `auth` | `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`, `VERIFICATION_SENT`, `PASSWORD_RESET_SENT` | `GOOGLE_NOT_CONFIGURED`, `INVALID_GOOGLE_TOKEN`, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `INVALID_REFRESH_TOKEN` |
| `users` | `USER_FETCHED`, `DELETION_CODE_SENT`, `ACCOUNT_DELETED` | `EMAIL_TAKEN`, `CODE_INVALID`, `CODE_EXPIRED`, `DELETION_CODE_INVALID`, `DELETION_CODE_EXPIRED`, `DELETION_CODE_RECENTLY_SENT` |
| `warranties` | `WARRANTIES_FETCHED`, `WARRANTY_FETCHED`, `WARRANTY_CREATED`, `WARRANTY_UPDATED` | `WARRANTY_NOT_FOUND`, `WARRANTY_LIMIT_REACHED`, `EXPIRY_BEFORE_PURCHASE` |
| `attachments` | `UPLOAD_CREATED` | `ATTACHMENT_NOT_FOUND`, `ATTACHMENT_NOT_UPLOADED`, `ATTACHMENT_MISMATCH`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `STORAGE_LIMIT_REACHED` |
| `notifications` | `NOTIFICATION_SETTINGS_FETCHED`, `NOTIFICATION_SETTINGS_UPDATED`, `PUSH_TOKEN_REGISTERED` | `INVALID_TIMEZONE` |
| `health` | `HEALTHY` | `SERVICE_UNAVAILABLE` (503) |

### 10.5 Validation errors

`ValidationPipe`'s `exceptionFactory` flattens class-validator's nested errors into one `ApiError` per field (`stopAtFirstError`: the first failed rule), with a dotted field path, and throws `ValidationError` (422).

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Some fields need fixing.",
  "data": null,
  "errors": [
    { "field": "productName", "code": "REQUIRED", "message": "Product name is required." },
    { "field": "proofOfPurchase", "code": "TOO_FEW_ITEMS", "message": "Add a proof of purchase to save." },
    { "field": "coverage.covered[2]", "code": "TOO_LONG", "message": "Must be 100 characters or fewer." }
  ],
  "meta": { "requestId": "req_…", "timestamp": "2026-09-26T18:10:00.000Z", "version": "v1" }
}
```

- Constraint → code in one map: `isNotEmpty`→`REQUIRED`, `isDateString`/custom `isYmd`→`INVALID_DATE`, `isIn`/`isEnum`→`INVALID_OPTION`, `min`/`max`→`OUT_OF_RANGE`, `maxLength`→`TOO_LONG`, `arrayMinSize`→`TOO_FEW_ITEMS`, `arrayMaxSize`→`TOO_MANY_ITEMS`, `whitelistValidation`→`UNKNOWN_FIELD`. Unmapped constraints become `INVALID_<CONSTRAINT>`.
- Field messages match the UI's `validate.ts` wording where the rule is the same, so the form can show them under the right field.

### 10.6 Pagination

Not used in v1: `GET /warranties` returns the full list (PRD API-WAR-9). This is the one format for when API-WAR-10 lands, reusable by any module.

```ts
// common/pagination/pagination.dto.ts
export class PageQueryDto { page = 1; pageSize = 20; } // @IsInt @Min(1); pageSize @Max(100)

// common/pagination/pagination.types.ts
export interface PaginationMeta {
  page: number; pageSize: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean;
}
export type Paginated<T> = { items: T[]; pagination: PaginationMeta };
export function paginate<T>(items: T[], totalItems: number, q: PageQueryDto): Paginated<T>;
```

- A service returns `Paginated<T>`. The interceptor sees it, puts `items` in `data` and `pagination` in `meta.pagination`. Controllers do nothing extra.
- Empty result: `data: []`, `totalItems: 0`, `totalPages: 0`, `hasNext: false`. A page past the end returns 200 with `data: []`. `page < 1` or `pageSize` outside 1–100 → 422.
- Offset pagination (`skip`/`take`) is enough for a per-user list. Switch to cursors only if lists grow past what `OFFSET` handles.

### 10.7 Request ID & context

A middleware runs first on every request and opens a request context with Node's built-in `AsyncLocalStorage` (`common/request-context/`). No `nestjs-cls` dependency.

- `requestId` = `req_` + `crypto.randomUUID()`. An inbound `x-request-id` is **ignored by default**, since any client can send anything. With `TRUST_REQUEST_ID=true` (only behind a gateway that sets it), an inbound value matching `^[A-Za-z0-9._-]{8,128}$` is kept.
- The context holds `{ requestId, userId?, version }`. `JwtGuard` sets `userId` after verifying the token.
- Where it goes: `meta.requestId` in every envelope, the `x-request-id` response header (also on 204 and on errors thrown before the interceptor), every log line, and the `x-request-id` header on outgoing calls that accept one (Expo push, and S3 through an SDK middleware).
- Cron runs (reminders, cleanup) open their own context with `job_` + UUID, so their logs are traceable the same way.

### 10.8 Versioning

```ts
app.setGlobalPrefix('api', { exclude: ['health'] });
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

- All routes are `/api/v1/...` (PRD §3 paths are relative to that). `/health` and `/docs` stay unprefixed.
- `meta.version` is read once from the matched route's version metadata by the builder. Controllers never mention it. A future `v2` handler uses `@Version('2')` on just the routes that change.
- The UI sets `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`.

### 10.9 Logging & observability

One access-log line per request, written by the middleware on `res.on('finish')`, so it also covers requests rejected by guards or pipes:

```json
{ "level": "info", "requestId": "req_5f0c…", "method": "POST", "route": "/api/v1/warranties", "status": 201, "durationMs": 142, "userId": "0b1e…" }
```

- `route` is the matched pattern (`/api/v1/warranties/:id`), not the raw URL.
- Never logged: request/response bodies, `Authorization`, tokens, deletion codes, emails, file names, presigned URLs.
- 5xx errors log the full error and stack with the same `requestId`.
- Multi-tenancy doesn't apply: the user is the only data scope, enforced by `userId` in every query (§3.3), and it isn't exposed in `meta`.
- **Traces later:** when OpenTelemetry is added (Tempo/Loki/Prometheus or similar), its HTTP instrumentation owns W3C `traceparent`, and the logger adds `traceId`/`spanId` from the active span. `requestId` stays separate: it's what users quote and what support searches for. `traceId` is for following a request across spans. Neither is overloaded as the other.

### 10.10 Security

- A client only ever sees messages we wrote: `AppError` messages and validation messages. Never a raw exception message, stack trace, SQL, Prisma meta, file path, hostname, bucket name or internal URL.
- Response DTOs are built by mapping functions (`to-response.ts`), never by returning Prisma rows, so fields like `googleSub`, `passwordHash`, `tokenHash` or `codeHash` can't leak by accident.
- `ApiError.details` holds only safe values meant for the client (e.g. `resendAfterSeconds`).

### 10.11 Swagger

- `@ApiResult({ code, message, type, status })` registers the envelope schema via `ApiExtraModels` + `getSchemaPath`, with `data` typed as `type`, and `meta.pagination` when `paginated: true`.
- `@ApiErrors(...statuses)` adds the error envelope for those statuses. 401, 429 and 500 are added to every non-`@Public()` route once, at document build time.
- Error envelope examples list the module's error codes, so Swagger shows what a client must handle.

### 10.12 Files

```
src/common/
  api-response/
    api-response.types.ts        # ApiResponse<T>, ApiMeta, ApiError
    api-response.builder.ts      # success(), failure()
    api-response.interceptor.ts  # wraps return values; handles Paginated<T>
    api-result.decorator.ts      # @ApiResult, @ApiErrors (metadata + Swagger)
  errors/
    app-error.ts                 # AppError + the error classes
    error-status.ts              # ERROR_STATUS: kind → HTTP status
    error-codes.ts               # shared codes
    all-exceptions.filter.ts     # anything thrown → error envelope
    validation.ts                # exceptionFactory: class-validator → ApiError[]
  pagination/                    # added with API-WAR-10 (interceptor then unwraps Paginated<T>)
    pagination.dto.ts            # PageQueryDto
    pagination.types.ts          # PaginationMeta, Paginated<T>, paginate()
  request-context/
    request-context.ts           # AsyncLocalStorage store + getRequestContext()
    request-context.middleware.ts# requestId, x-request-id header, access log
```

They are registered once in `app.setup.ts` / `app.module.ts` (`APP_INTERCEPTOR`, `APP_FILTER`, global pipe, middleware). No module imports them except for types, decorators and error classes.

## 11. Dependencies

Installed: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/throttler`, `prisma` + `@prisma/client` + `@prisma/adapter-pg` (7.10, pinned: the CLI's `latest` tag was an 8.0 RC), `class-validator`, `class-transformer`, `@nestjs/jwt` (^11), `google-auth-library`, `nodemailer`, `@aws-sdk/client-s3`, jest, supertest.

To add:

| Package | For | When |
|---|---|---|
| `@aws-sdk/s3-request-presigner` | presigned receipt URLs | M2 |
| `@nestjs/schedule` | reminder + cleanup crons | M2 |

Deliberately **not** added: `@nestjs/config` (one `env.ts`), passport (one strategy; a 20-line guard), `expo-server-sdk` (one `fetch`), `firebase-admin` (until an `fcm` adapter is needed), a date library (`Intl` + plain date strings), a queue (BullMQ/Redis), TypeORM.

## 12. Testing

- **Unit** (jest, `*.spec.ts`), pure logic only:
  - `modules/warranties/expiry.ts`: month-end clamping, same cases as the UI's `status.check.ts`.
  - `modules/notifications/schedule.ts`: offsets → UTC instants across timezones and DST (e.g. `Europe/London` in March), past dates skipped.
- **E2E** (`test/*.e2e-spec.ts`, supertest, real Postgres from `docker compose`, mocked Google verifier and S3 HEAD):
  - Auth: exchange, refresh rotation, refresh reuse revokes the family.
  - **Isolation:** user B gets 404 on every `/warranties/:id` route for user A's warranty, and can't attach A's attachment id.
  - Warranty create → GET matches the UI `Warranty` shape exactly (no `null`s, dates as `YYYY-MM-DD`).
  - Deletion: wrong code ×5 locks; right code removes all rows.
  - Reminder send: two concurrent runs send each reminder once.
- `test/auth-users.e2e-spec.ts` (done): real Postgres + RustFS, fake Google verifier and mail. Sign-in/upsert, unverified email, JWT guard, refresh rotation + reuse revoking the family, concurrent refresh, logout, deletion (resend wait, wrong code, 5-attempt lock, expiry, spaces ignored, DB rows + S3 prefix removed). Email/password: register → verify → login, case-insensitive email, one error for unknown/wrong/Google-only, 409 on verified email, takeover of unverified sign-ups, resend/forgot don't reveal accounts, reset revokes sessions, Google-only adds a password, Google links to verified and takes over unverified accounts, field validation.
- **Response contract** (§10):
  - Success: 200 (GET), 201 (POST create), 204 (DELETE, no body) all carry the right envelope/header.
  - Errors: one test per status 400, 401, 404, 409, 422, 429, 500, 503. Each checks the envelope, the code, `data: null`, and that 5xx bodies contain no stack, SQL or Prisma text. 403 and 202 have no route yet; the filter's status map is unit-tested for them.
  - Validation: missing field, invalid field, nested field (`coverage.covered[2]`), several errors in one response, unknown field.
  - Request id: generated when absent, ignored when sent and `TRUST_REQUEST_ID` is off, returned in `meta` and `x-request-id`, present in the access log line, sent on the outgoing Expo push call.
  - Pagination (unit, `paginate()`): first, middle and last page, empty result, page past the end; 422 for `page=0` and `pageSize=101`.
  - Every controller handler has `@ApiResult` (walks the Nest metadata).
- Both jest scripts run with `NODE_OPTIONS=--experimental-vm-modules`: Prisma 7 loads its query compiler with a dynamic `import()`, which Jest's VM refuses without it.
- The response-contract e2e suite (`test/response-contract.e2e-spec.ts`) mounts a test-only controller next to `AppModule` and goes through the real `setupApp()`, so it tests the production wiring.
- CI (GitHub Actions): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` with a Postgres service container.

## 13. Local Development & Deployment

`docker-compose.yml` runs the dev dependencies (the API itself runs on the host with `pnpm start:dev`):

| Service | Ports | Notes |
|---|---|---|
| `db` (Postgres 17) | 5432 | user/password/db `jaminly` |
| `rustfs` (RustFS 1.0, S3-compatible) | 9000 API, 9001 console at `/rustfs/console/` | Replaces MinIO, whose images are no longer published. Keys `jaminly` / `jaminly-dev-secret`. |
| `rustfs-init` (aws-cli) | — | Creates the private `jaminly-receipts` bucket once, then exits. Safe to rerun. |
| `mailhog` | 1025 SMTP, 8025 inbox | `linux/amd64` only; emulated on Apple Silicon |

First run: `cp .env.example .env && docker compose up -d && pnpm db:migrate`.

- `pnpm dev` at the repo root runs API (3001) and UI (8081). Point the UI at `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1` (use the machine's LAN IP for a physical phone).
- `prisma migrate deploy` runs before `node dist/main` in production.
- Deploy target: any container host (Fly.io, Railway, a VPS). One container + managed Postgres + R2/S3. Presigned URLs must use the public bucket endpoint, not an internal one.

## 14. Milestone Mapping

| PRD milestone | Architecture work |
|---|---|
| M1 — Real auth | **Done (foundations):** `env.ts`, Prisma + migrations (User, RefreshToken, EmailCode), response contract (§10: envelope, errors, request context, versioning), `prisma`, `health`, throttler, docker compose, lint rule for vendor imports. **Done:** `mail`, `storage` (deletePrefix), `google`, `auth` (email/password with emailed codes + Google, account linking), `users` incl. account deletion. **Deferred to M2:** hourly cleanup crons for expired codes/refresh tokens (need `@nestjs/schedule`), timezone capture. |
| M2 — API | **Done:** Warranty/Attachment/Reminder/PushToken tables, `attachments`, `push` (Expo + log), `notifications` (settings, push tokens, reminders), `warranties`, hourly cleanups (unlinked uploads, expired codes, unverified sign-ups, expired refresh tokens), optional per-user limits, `test/warranties.e2e-spec.ts`. |
| M3 — OSS release | `.env.example`, README self-hosting guide, CI workflow |
| M4 — Launch | Production deploy, backups, log review for PII |
