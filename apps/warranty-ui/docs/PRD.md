# PRD — Jaminly

| | |
|---|---|
| **Status** | Draft v0.2 |
| **License** | Open source (MIT, TBC) |
| **Owner** | Farid Aiman |
| **Last updated** | 2026-09-26 |
| **Platforms** | iOS, Android, Web (single Expo codebase, Expo SDK 57) |

---

## 1. Summary

Jaminly is a free, open-source personal warranty vault. Users sign in with Google and register the products they buy. Each warranty **must** include a proof of purchase (receipt/invoice photo or PDF). The app stores what the warranty covers and sends reminders before it expires, so users can claim while they still can.

## 2. Problem

- Receipts fade, get lost, or are buried in email.
- People forget warranty periods and discover the product is out of warranty only after it breaks.
- Even with a receipt, users rarely know *what* is covered (parts vs. labour, accidental damage, battery, etc.), so they don't claim things they're entitled to.

## 3. Goals & Non-goals

### Goals
1. Register a warranty with proof of purchase in **under 60 seconds**.
2. Never miss an expiry: timely reminders on mobile push and email.
3. Show, at a glance, what each warranty covers and doesn't cover.
4. One account, same data on web and mobile.
5. Build the UI now against mock data; switch to the real API with a flag.
6. Open source and easy to self-host: anyone can clone, configure, and run their own instance.

### Non-goals (v1)
- Filing claims with manufacturers/retailers on the user's behalf.
- OCR / automatic receipt parsing (candidate for v2).
- Sharing warranties with family members / households (v2).
- Business/fleet asset management.
- Sign-in methods other than Google.
- Subscriptions, payments, or paywalls. The app is free and open source.

## 4. Target Users

| Persona | Description | Key need |
|---|---|---|
| **Household manager** | Buys appliances, electronics, furniture for the family | One place for all receipts; reminders |
| **Gadget owner** | Phones, laptops, headphones, frequent upgrades | Know coverage before paying for repair |
| **Small business owner** (secondary) | Office equipment, a few dozen items | Quick lookup when something breaks |

## 5. User Stories

**Auth**
- As a new user, I sign in with Google so I don't need another password.

**Warranties**
- As a user, I add a product with its purchase date, warranty length, and proof of purchase.
- As a user, I can't save a warranty until a proof of purchase is attached.
- As a user, I write/select what the warranty covers and excludes.
- As a user, I see all my warranties sorted by what expires soonest.
- As a user, I search and filter by category, status, or store.
- As a user, I open a warranty and view the receipt full-screen when talking to a service centre.

**Reminders**
- As a user, I get a reminder before a warranty expires (e.g. 30 days and 7 days before).
- As a user, I can change reminder timing per warranty or globally, and choose push and/or email.

## 6. Functional Requirements

Priority: **P0** = MVP must-have, **P1** = should-have for launch, **P2** = later.

### 6.1 Authentication — Google SSO
| ID | Requirement | Pri |
|---|---|---|
| AUTH-1 | Sign in with Google on iOS, Android, and Web. | P0 |
| AUTH-2 | First Google sign-in auto-creates the account (no separate register screen). | P0 |
| AUTH-3 | Session persists across app restarts (token in secure storage on native; http-only cookie or secure storage on web). | P0 |
| AUTH-4 | Sign out from settings; clears local cache. | P0 |
| AUTH-5 | Delete account + all data (required by App Store / Play policy). User types "delete", then enters a one-time code emailed to them. | P0 |
| AUTH-6 | Unauthenticated users are redirected to `(auth)/login`; authenticated to `(app)`. | P0 |

> Note: current `src/app/(auth)/register.tsx` becomes unnecessary with Google-only sign-in.

### 6.2 Warranty management
| ID | Requirement | Pri |
|---|---|---|
| WAR-1 | Create warranty with fields in §7. | P0 |
| WAR-2 | **Proof of purchase is mandatory.** Save button disabled until at least one file is attached. | P0 |
| WAR-3 | Attach proof via camera, photo library, or file picker (JPG/PNG/HEIC/PDF, ≤10 MB each, up to 5 files). | P0 |
| WAR-4 | Expiry date auto-calculated from purchase date + warranty length; user can override. | P0 |
| WAR-5 | Coverage section: "Covered" and "Not covered" lists + free-text notes. | P0 |
| WAR-6 | List view sorted by expiry, with status badge (Active / Expiring soon / Expired). | P0 |
| WAR-7 | Detail view with receipt preview (full-screen, zoom). | P0 |
| WAR-8 | Edit and delete warranty (delete asks for confirmation). | P0 |
| WAR-9 | Search by product/brand/store; filter by category and status. | P1 |
| WAR-10 | Coverage templates per category (e.g. "Electronics: manufacturing defects, parts & labour; excludes water/accidental damage") to speed entry. | P1 |
| WAR-11 | Extended warranty as a second period on the same product. | P2 |
| WAR-12 | Export warranty + receipt as PDF to share with a service centre. | P2 |

### 6.3 Reminders & notifications
| ID | Requirement | Pri |
|---|---|---|
| NOT-1 | Default reminders at **30 days** and **7 days** before expiry, plus on expiry day. | P0 |
| NOT-2 | Channels: push (mobile) and email (all platforms). User toggles each. | P0 |
| NOT-3 | Per-warranty override of reminder offsets. | P1 |
| NOT-4 | Reminders are scheduled **server-side** so they work when the app isn't opened and across devices. | P0 (when API lands) |
| NOT-5 | Until API is ready, schedule local notifications on device (behind flag). | P0 |
| NOT-6 | Tapping a notification deep-links to the warranty detail. | P1 |
| NOT-7 | In-app "Expiring soon" section on the home screen. | P0 |

### 6.4 Settings
- Profile (name, email, avatar from Google) — read-only.
- Notification preferences (§6.3).
- About: app version, link to the GitHub repo, license.
- Sign out, Delete account.
- Privacy policy & Terms links.

## 7. Data Model (draft)

```ts
type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
};

type Warranty = {
  id: string;
  userId: string;
  productName: string;          // required
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: 'electronics' | 'appliance' | 'furniture' | 'vehicle' | 'other';
  store?: string;
  purchaseDate: string;         // required, ISO date
  price?: { amount: number; currency: string };
  warrantyMonths: number;       // required
  expiryDate: string;           // derived, overridable
  coverage: {
    covered: string[];          // e.g. ["Parts", "Labour", "Battery (6 months)"]
    notCovered: string[];       // e.g. ["Accidental damage", "Water damage"]
    notes?: string;
  };
  proofOfPurchase: Attachment[]; // required, min 1
  reminderOffsetsDays: number[]; // default [30, 7, 0]
  createdAt: string;
  updatedAt: string;
};

type Attachment = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};
```

Status is derived, not stored: `expired` if today > expiryDate, `expiring_soon` if ≤ 30 days left, else `active`.

## 8. Screens & Navigation (Expo Router)

```
src/app/
  _layout.tsx                 # root: auth gate
  (auth)/
    _layout.tsx
    login.tsx                 # "Continue with Google"
  (app)/
    _layout.tsx               # tabs
    index.tsx                 # Home: expiring soon + all warranties
    warranty/new.tsx          # Add warranty (multi-step or single form)
    warranty/[id].tsx         # Detail
    warranty/[id]/edit.tsx
    settings.tsx
```

Key flows:
1. **Onboarding:** Login → Google → Notification permission prompt → Empty home with "Add your first warranty".
2. **Add warranty:** Attach proof (camera/file) → Product details → Warranty length (auto expiry) → Coverage → Reminders → Save.
3. **Reminder:** Push → Warranty detail → View receipt.

## 9. API Integration & Feature Flags

The backend isn't ready. The UI talks to a single data layer that switches between mock and real implementations by flag, using Expo public env vars (`EXPO_PUBLIC_*`, read at build time).

| Flag | Default (now) | Purpose |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCK_API` | `true` | Use in-memory/local-storage mock data instead of HTTP calls. |
| `EXPO_PUBLIC_API_BASE_URL` | _(empty)_ | Real API base URL when mock is off. |
| `EXPO_PUBLIC_MOCK_AUTH` | `true` | Skip real Google OAuth; sign in as a fake user. Lets UI work before OAuth client IDs exist. |
| `EXPO_PUBLIC_LOCAL_REMINDERS` | `true` | Schedule reminders as on-device local notifications until server-side scheduling exists. |

Expected API surface (for backend team):

```
POST   /auth/google            { idToken } → { accessToken, refreshToken, user }
POST   /auth/refresh
POST   /me/deletion            # email a one-time code to confirm account deletion
DELETE /me                     { code } → deletes the account and all data
GET    /warranties?status=&category=&q=
POST   /warranties
GET    /warranties/:id
PATCH  /warranties/:id
DELETE /warranties/:id
POST   /uploads                # → signed upload URL for proof of purchase
PUT    /me/notification-settings
POST   /me/push-tokens         # register Expo push token
```

## 10. Non-functional Requirements

- **Security & privacy:** receipts may contain addresses and partial card numbers — store files in private buckets, serve via short-lived signed URLs, encrypt at rest, HTTPS only. Tokens in `expo-secure-store` on native. Comply with PDPA (Malaysia) / GDPR as applicable.
- **Performance:** home list renders < 1s with 200 warranties; images compressed before upload (e.g. max 2000px, ~80% JPEG).
- **Offline:** warranty list and receipts viewable offline from cache (P1); creating offline is P2.
- **Accessibility:** screen-reader labels, dynamic font size, WCAG AA contrast, light/dark theme (already scaffolded in `src/constants/theme.ts`).
- **Platform parity:** web gets all features except push (email only) and camera may fall back to file upload.
- **Store compliance:** in-app account deletion.

## 11. Open Source

- **Repo hygiene:** `README` (setup, screenshots), `CONTRIBUTING.md`, issue/PR templates, `CODE_OF_CONDUCT.md`.
- **No secrets in the repo:** all keys (Google OAuth client IDs, API URL) come from `.env`; ship a `.env.example`. Mock flags default to `true` so a fresh clone runs with zero setup.
- **Self-hosting:** document how to run your own backend and point the app at it via `EXPO_PUBLIC_API_BASE_URL`, and how to create your own Google OAuth client IDs.
- **License:** current `LICENSE` is the Expo template's (copyright 650 Industries). Replace with your own MIT (or chosen) license before publishing.
- **Success signals:** GitHub stars, contributors, self-hosted instances, and product usage (sign-in → first warranty ≥ 60%, median add time < 60s, reminder open rate ≥ 30%) if telemetry is opt-in.

## 12. Open Questions

1. **Coverage source:** always user-entered, or do we maintain templates per brand/category?
2. **Proof of purchase:** is a photo of the product box/serial acceptable, or strictly receipt/invoice? Allow e-receipt email forwarding later?
3. **Storage limits:** max warranties/files per user on the hosted instance?
4. **Email provider** for reminders (backend decision).
5. **Hosting:** will there be an official public instance, or self-host only?
6. **Telemetry:** any analytics at all? If yes, opt-in only.

## 13. Milestones

| Phase | Scope |
|---|---|
| **M0 — UI on mocks** | Navigation, login (mock auth), warranty CRUD with required proof upload, coverage, list/detail, local reminders. All flags on mock. |
| **M1 — Real auth** | Google SSO on iOS/Android/Web (`MOCK_AUTH=false`), secure session, account deletion. |
| **M2 — API** | Switch `USE_MOCK_API=false`; uploads via signed URLs; server-side reminders + push token registration + email. |
| **M3 — Open-source release** | README, CONTRIBUTING, `.env.example`, license, self-hosting guide. |
| **M4 — Launch** | EAS builds, store listings, privacy policy. |
| **v2** | OCR receipt scan, household sharing, PDF export, extended warranties, email-forwarded receipts. |
