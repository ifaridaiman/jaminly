# Jaminly — Frontend Architecture

Status: Draft v0.1 · Last updated 2026-09-26 · Related: [PRD](./PRD.md), [DESIGN](./DESIGN.md)

One Expo codebase for iOS, Android and Web (Expo SDK 57, React Native 0.86, React 19, Expo Router, React Compiler on). This doc explains how the code is laid out, how data moves, and the few rules that keep it simple.

---

## 1. Principles

1. **Screens are thin.** A route file puts components together and calls hooks. Logic lives in `features/`.
2. **One door to the backend.** Every server call goes through `src/lib/api`. Screens never call `fetch` directly. That makes the mock ↔ real switch a single flag.
3. **Few dependencies.** Use Expo modules first; add a library only when it saves real work (see §9).
4. **Platform differences stay in files.** Use the `.web.tsx` / `.native.tsx` suffixes (already used in `components/`), not `Platform.OS` checks scattered through screens.
5. **Runs on a fresh clone.** With default flags the app runs in Expo Go with no keys and no backend. This matters for open-source contributors.

## 2. Folder Structure

```
src/
  app/                          # Routes only (Expo Router). Every file is a screen.
    _layout.tsx                 # Providers + auth gate (Stack.Protected)
    (auth)/
      _layout.tsx               # Stack; back button on everything but login
      login.tsx                 # email + password, "Continue with Google"
      register.tsx
      verify-email.tsx          # reads the pending email from the session, not the URL
      forgot-password.tsx       # two steps on one screen
    (app)/
      _layout.tsx               # Tabs: Home, Settings
      index.tsx                 # Home: expiring soon + all warranties
      settings.tsx
      warranty/
        new.tsx                 # Add (modal)
        [id].tsx                # Detail
        [id]/edit.tsx           # Edit (modal)
        [id]/receipt.tsx        # Full-screen receipt viewer

  features/                     # One folder per product area
    auth/
      session-provider.tsx      # user, sign-in method, pendingEmail, startSession(), signOut()
      google-button.tsx         # "Continue with Google" (mock today; google-signin at M1)
      validate.ts               # email / new-password rules, same as the API DTOs
      auth-screen.tsx, or-divider.tsx, dev-code-hint.tsx
    warranties/
      hooks.ts                  # useWarranties, useWarranty, useSaveWarranty, useDeleteWarranty
      status.ts                 # getExpiryDate(), getStatus()  ← pure, tested
      validate.ts               # validateWarranty()           ← pure, tested
      coverage-templates.ts     # default covered/not-covered by category
      components/               # WarrantyCard, WarrantyForm, ProofPicker, CoverageEditor…
    reminders/
      schedule.ts               # schedule/cancel local notifications for a warranty
      schedule.web.ts           # no-op (web gets email only, from server)

  lib/
    env.ts                      # typed reader for EXPO_PUBLIC_* flags
    api/
      index.ts                  # exports `api`, picks mock or http from env
      types.ts                  # User, Warranty, Attachment, ApiClient
      http.ts                   # real client (fetch + auth header + refresh)
      mock.ts                   # in-memory + persisted fake backend
    storage.ts                  # token storage: SecureStore (native)
    storage.web.ts              # token storage: localStorage (web)
    query-client.ts             # TanStack Query client

  components/                   # Shared UI (no feature knowledge)
    ui/                         # Button, TextField, DateField, Badge, Card, EmptyState, Screen
    themed-text.tsx             # existing
    themed-view.tsx             # existing
  constants/theme.ts            # design tokens (see DESIGN.md)
  hooks/                        # generic hooks (use-theme, use-color-scheme)
```

Rules:
- `app/` imports from `features/`, `components/` and `lib/`. **Never the other way round.**
- `features/X` may import `lib/` and `components/`. It does not import another feature's internals, only what that feature exports on purpose (such as `useSession`).
- `components/ui` knows nothing about warranties.

**Clean-up from the template:** delete the `explore` tab, `hint-row`, `web-badge`, `animated-icon*` and the React/Expo logo images once real screens replace them.

## 3. Navigation & Auth Gate

Expo Router with `Stack.Protected` (available in the installed `expo-router`):

```tsx
// src/app/_layout.tsx
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useSession();
  if (isLoading) return null; // splash screen stays visible until the session is restored

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
```

- This replaces the hard redirect in `src/app/index.tsx` (delete that file; `(app)/index.tsx` becomes `/`).
- `(app)/_layout.tsx` uses the existing `AppTabs` (NativeTabs on native, `app-tabs.web.tsx` on web) with **Home** and **Settings**.
- Add/Edit open as modals (`presentation: 'modal'`). The receipt viewer is a full-screen modal.
- Deep link from a notification: `jaminly://warranty/<id>` → `warranty/[id].tsx` (scheme already set in `app.json`).

## 4. Data Layer

### 4.1 API client (mock ↔ real)

```ts
// lib/api/types.ts
export interface ApiClient {
  signInWithGoogle(idToken: string): Promise<{ user: User; accessToken: string; refreshToken: string }>;
  getMe(): Promise<User>;
  requestAccountDeletion(): Promise<{ email: string; resendAfterSeconds: number }>; // emails a code
  confirmAccountDeletion(code: string): Promise<void>; // server checks the code, then deletes
  listWarranties(q?: WarrantyQuery): Promise<Warranty[]>;
  getWarranty(id: string): Promise<Warranty>;
  createWarranty(input: WarrantyInput): Promise<Warranty>;
  updateWarranty(id: string, input: Partial<WarrantyInput>): Promise<Warranty>;
  deleteWarranty(id: string): Promise<void>;
  uploadProof(file: LocalFile): Promise<Attachment>;
  saveNotificationSettings(s: NotificationSettings): Promise<void>;
  registerPushToken(token: string): Promise<void>;
}

// lib/api/index.ts
export const api: ApiClient = env.useMockApi ? mockApi : httpApi;
```

`ApiClient` is the one interface in the codebase that has two implementations, which is why it exists. Its methods match the endpoints in PRD §9, so the backend team can build against it.

- **mock.ts:** keeps data in memory, saves it to AsyncStorage so it survives reloads, adds ~300 ms of fake latency so loading states get exercised, and comes with a few sample warranties. `uploadProof` just returns the local file URI.
- **http.ts:** a thin `fetch` wrapper that adds the `Authorization` header, retries once after a token refresh on a 401, and turns error responses into an `ApiError { status, message }`. Uploads use `POST /uploads` to get a signed URL, then `PUT` the file to it.

### 4.2 Server state: TanStack Query

Warranties are server data, so they are cached, not copied into global state.

```ts
// features/warranties/hooks.ts
export const useWarranties = (q?: WarrantyQuery) =>
  useQuery({ queryKey: ['warranties', q], queryFn: () => api.listWarranties(q) });

export const useSaveWarranty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (w: WarrantyInput & { id?: string }) =>
      w.id ? api.updateWarranty(w.id, w) : api.createWarranty(w),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['warranties'] });
      rescheduleReminders(saved);
    },
  });
};
```

Why TanStack Query and not hand-written hooks: caching, pull-to-refresh, loading and error states, retries and invalidation after saving are all needed on day one. Hand-writing those would take more code than the library.

### 4.3 Client state

- **Session** (user + tokens): React Context in `features/auth/session-provider.tsx`.
- **Form state:** local `useState` inside `WarrantyForm`.
- **No global store** (Redux/Zustand). Add one only if client-only state starts being shared across unrelated screens.

### 4.4 Derived data

A warranty's status is **computed, never stored** (`features/warranties/status.ts`):

```ts
export function getStatus(expiryDate: string, today = new Date()): 'active' | 'expiring_soon' | 'expired'
```

Dates are stored as ISO `YYYY-MM-DD` strings and compared as calendar dates in the user's local timezone. No date library: `Date` plus `Intl.DateTimeFormat` covers adding months and formatting. Adding months clamps to the end of the month (31 Jan + 1 month = 28/29 Feb).

## 5. Authentication

Email/password is the main path; Google is an alternative on the same account (API ARCHITECTURE §5 has the linking rules).

| Flow | Screens | API calls |
|---|---|---|
| Sign up | `register` → `verify-email` | `register` → `verifyEmail` (returns the session) |
| Sign in | `login` | `login`; `EMAIL_NOT_VERIFIED` → set `pendingEmail`, go to `verify-email` |
| Forgot password | `forgot-password` (email, then code + new password) | `forgotPassword` → `resetPassword` (returns the session) |
| Google | button on `login` and `register` | `signInWithGoogle(idToken)` |

- Screens call the API client and hand the result to `startSession(session, method)`. The session remembers the method only to show "Signed in with Google / email" in Settings.
- The email waiting for a code lives in `SessionProvider.pendingEmail`, not a URL param, so it doesn't end up in web history. Reloading `verify-email` without it redirects to login.
- Errors are `ApiError { code, message, fields }` (`lib/api/errors.ts`). Screens branch on `code`, show `message` as-is, and put `fields[name]` under the matching input.
- **Always the real API** (`lib/api/http.ts`), even while warranties are mocked. Locally: `pnpm dev` at the repo root (API on 3001) and `docker compose up` in `apps/warranty-api`; emailed codes land in MailHog at http://localhost:8025 (a dev-only hint says so).
- **Tokens:** the access token (15 min) lives only in memory. The refresh token is saved with `lib/storage.ts` (SecureStore on native, `localStorage` on web) and swapped for a fresh session on launch (`api.restoreSession()`), so a reload keeps you signed in. A 401 triggers one refresh and a replay; concurrent 401s share one refresh (each refresh token works once). A failed refresh signs the device out.
- **Sign out** clears the tokens locally first, then revokes the refresh token on the server (best effort, so it works offline).

| Google mode | How it works |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` empty (default) | The Google button and its "or" divider are hidden. |
| Native, real | `@react-native-google-signin/google-signin` with `webClientId` (needed to get an ID token). Needs a **development build**. Sends the ID token to `POST /auth/google`. |
| Web, real | Google Identity Services with the same Web client ID. Confirm the exact library at M1. |

- The backend issues its own access and refresh tokens; the app never trusts the Google token beyond that exchange.
- **Token storage** (`lib/storage.ts`): `expo-secure-store` on native. SecureStore **doesn't support web**, so `storage.web.ts` uses `localStorage`, with a later move to http-only cookies once the backend supports them.
- On start-up, `SessionProvider` reads the token, calls `api.getMe()`, and keeps the splash screen up until that finishes.
- Sign out clears the tokens and the query cache (`queryClient.clear()`) and cancels local reminders.

## 6. Proof of Purchase (files)

| Source | Module | Platforms |
|---|---|---|
| Camera | `expo-image-picker` (`launchCameraAsync`) | iOS, Android (web: hidden) |
| Photo library | `expo-image-picker` | all |
| PDF / file | `expo-document-picker` | all |

- Images are resized to a maximum of 2000 px and compressed to about 80% JPEG with `expo-image-manipulator` before upload.
- Limits: JPG/PNG/HEIC/PDF, 10 MB each, up to 5 files per warranty. These are checked in `validateWarranty()` and checked again on the server.
- Display with `expo-image` (already installed). PDFs open through `expo-web-browser` / a new tab on web.
- Upload happens **on save, not on pick**, so abandoned forms don't leave orphan files.

## 7. Reminders

**Until the backend exists** (`EXPO_PUBLIC_LOCAL_REMINDERS=true`):
- `features/reminders/schedule.ts` uses `expo-notifications` DATE triggers, one per offset (default 30/7/0 days) at 09:00 local time.
- The notification identifier is `${warrantyId}:${offset}`, so an edit cancels and re-creates that warranty's set.
- Local notifications work in Expo Go. **Push** needs a development build on Android.
- Web: `expo-notifications` doesn't support web, so `schedule.web.ts` is a no-op and web relies on the in-app "Expiring soon" list.

**With the backend** (flag off): the server schedules the reminders; the app only registers its Expo push token (`api.registerPushToken`) and handles taps (deep link to the detail screen).

Ask for notification permission **after the first warranty is saved**, not at launch, so the user sees why it's needed.

## 8. Configuration & Flags

```ts
// lib/env.ts
export const env = {
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false', // warranties only
  localReminders: process.env.EXPO_PUBLIC_LOCAL_REMINDERS !== 'false',
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};
```

- `process.env.EXPO_PUBLIC_*` must be written out in full (it's replaced at build time), so read the variables only here.
- `.env` (committed, no secrets) points at the local API and turns on web pop-ups. Personal overrides (e.g. a LAN IP for a phone) go in `.env.local`.
- `.env.example` is committed; `.env` is git-ignored. `EXPO_PUBLIC_*` values end up in the app bundle, so **no secrets** go in them (a Google client ID is fine; a client secret never is).
- Google config files (`google-services.json`, `GoogleService-Info.plist`) are provided as EAS file env vars, not committed.

## 9. Dependencies

Already installed and used: `expo-router`, `expo-image`, `expo-symbols`, `expo-web-browser`, `expo-splash-screen`, `react-native-reanimated`, `react-native-gesture-handler`, `@expo/ui`.

To add (always with `npx expo install`):

| Package | For | When |
|---|---|---|
| `@tanstack/react-query` | server state | M0 |
| `@react-native-async-storage/async-storage` | mock backend persistence | M0 |
| `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator` | proof of purchase | M0 |
| `expo-notifications` | reminders | M0 |
| `expo-secure-store` | tokens (native) | M1 |
| `@react-native-google-signin/google-signin` | Google sign-in (native, optional path) | M1 |
| `jest-expo`, `jest` | unit tests | M0 |

Deliberately **not** added: a UI kit, NativeWind/Tamagui, Redux/Zustand, a date library, react-hook-form, zod. Add zod only if the backend publishes a shared schema.

## 10. Styling

- Use `StyleSheet.create` with the tokens in `src/constants/theme.ts` and read colours through `useTheme()`. The token set is defined in [DESIGN.md](./DESIGN.md).
- Light and dark mode follow the system (`userInterfaceStyle: automatic` is already set).
- Web: content is centred with `MaxContentWidth` (already defined), and the list becomes two columns at ≥ 768 px.

## 11. Error, Loading & Offline

- Every query screen shows three states: loading (skeleton), error (message + Retry), and empty (see DESIGN.md).
- Mutations show a toast on failure and keep the form's contents, so **user input is never lost** on a failed save.
- TanStack Query keeps the last list in memory. Persisting the cache for offline viewing (PRD P1) can use `@tanstack/query-async-storage-persister` later.
- Wrap `(app)` in an error boundary (export `ErrorBoundary` from the route layout, supported by Expo Router).

## 12. Testing & Quality

- **Unit tests** only for pure logic that could quietly go wrong: `status.ts` (month clamping, today/expiry edges), `validate.ts` (missing proof, file limits), and the reminder offset calculation. `jest-expo` preset.
- No snapshot tests. Component and E2E tests (Maestro) come later, once the flows settle.
- Before every PR: `npx expo lint` and `npx tsc --noEmit`. The CI GitHub Action runs both plus `jest`.
- Add a `typecheck` script to `package.json`.

## 13. Build & Release

- **M0:** Expo Go on every platform (all mocks).
- **M1+:** Google Sign-In and push need a development build: `npx expo run:ios|android` or `eas build --profile development`.
- Web: `npx expo export -p web` (static output is already configured). Any static host works, which suits self-hosters.
- OTA fixes via `eas update`. Store builds via `eas build` / `eas submit`.
- Never hand-edit `ios/`/`android/`. Native config goes in `app.json` plugins (`expo-notifications`, `expo-image-picker` permission strings, google-signin plugin).

## 14. Milestone Mapping

| PRD milestone | Architecture work |
|---|---|
| M0 — UI on mocks | Folder structure, `env.ts`, `api/mock.ts`, TanStack Query, auth gate with mock auth, warranty CRUD, local reminders, unit tests |
| M1 — Real auth | `http.ts` auth calls + token refresh, `storage.ts`, google-sign-in native + web, dev build |
| M2 — API | `api/http.ts`, signed uploads, push token registration, turn off local reminders |
| M3 — OSS release | `.env.example`, CI workflow, CONTRIBUTING |
