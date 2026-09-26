# Jaminly — Design

Status: Draft v0.1 · Last updated 2026-09-26 · Related: [PRD](./PRD.md), [ARCHITECTURE](./ARCHITECTURE.md)

The design system and screen designs for the warranty app on iOS, Android and Web.

---

## 1. Design Principles

1. **Calm, not alarming.** Most warranties are fine most of the time. Colour and urgency are reserved for things that are expiring soon or have expired.
2. **The receipt is the hero.** Proof of purchase is what users need at the service counter, so it's never more than one tap away.
3. **Quick to capture.** Adding a warranty starts with the camera and takes under 60 s. Only product name, purchase date, warranty length and proof are required; everything else is optional.
4. **Native feel on each platform.** Use native tabs, native modals and SF Symbols on iOS; Material-style behaviour on Android; a centred, readable layout on the web.
5. **Status is never shown by colour alone.** Every status has an icon and text as well.

## 2. Brand

- **Name:** Jaminly (from Malay *jaminan*, "guarantee"). Always written "Jaminly" in UI copy, "jaminly" in identifiers.
- **Personality:** trustworthy, tidy, quietly helpful. Like a well-organised drawer.
- **Voice:** plain and short. Say "Expires in 12 days", not "Your warranty is about to reach its expiration date!".
- **Brand colour:** the blue already used for the splash screen (`#208AEF`), used for the logo, splash and illustrations. Buttons and text use darker or lighter shades that pass contrast checks (see below).

## 3. Design Tokens

These replace and extend `src/constants/theme.ts`, keeping its existing key names so current components keep working.

### 3.1 Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFFFF` | `#000000` | screen background |
| `backgroundElement` | `#F0F0F3` | `#212225` | cards, inputs |
| `backgroundSelected` | `#E0E1E6` | `#2E3135` | pressed/selected |
| `text` | `#000000` | `#FFFFFF` | primary text |
| `textSecondary` | `#60646C` | `#B0B4BA` | labels, metadata |
| `border` | `#D9D9E0` | `#3A3D42` | dividers, input borders |
| `primary` | `#0969DA` | `#4C9EFF` | buttons, links, focus |
| `onPrimary` | `#FFFFFF` | `#000000` | text on primary |
| `success` | `#1A7F37` | `#3FB950` | Active status |
| `successBg` | `#DAFBE1` | `#12261E` | Active badge fill |
| `warning` | `#9A6700` | `#D29922` | Expiring soon |
| `warningBg` | `#FFF8C5` | `#2E2410` | Expiring badge fill |
| `danger` | `#CF222E` | `#F85149` | Expired, delete, errors |
| `dangerBg` | `#FFEBE9` | `#2D1214` | Expired badge fill, error banner |

Every text/background pair above meets **WCAG AA (4.5:1)**. `#208AEF` is **not** used for text or buttons with white labels, because it only reaches about 3.4:1 against white.

### 3.2 Typography

System fonts (`Fonts.sans` from the existing theme): SF Pro on iOS, Roboto on Android, the system UI font on the web. No custom font files to load.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| `largeTitle` | 32 / 40 | 700 | screen titles (Home) |
| `title` | 22 / 28 | 700 | detail header (product name) |
| `headline` | 17 / 22 | 600 | card title, section headers |
| `body` | 17 / 24 | 400 | default text, inputs |
| `callout` | 15 / 20 | 400 | secondary body, list items |
| `caption` | 13 / 18 | 500 | badges, metadata, helper text |

Support Dynamic Type / font scaling: never set `allowFontScaling={false}`, and let layouts grow vertically.

### 3.3 Spacing, radius, elevation

- **Spacing:** keep the existing `Spacing` scale (`one`=4, `two`=8, `three`=16, `four`=24, `five`=32, `six`=64). Screen side padding = `three` (16); gap between cards = `two`/`three`.
- **Radius:** `sm` 8 (inputs, badges), `md` 12 (cards, buttons), `lg` 20 (sheets, receipt thumbnail).
- **Elevation:** flat. Cards use `backgroundElement`, not shadows. Only floating elements (the FAB on Android, the toast) get a soft shadow.
- **Touch targets:** at least 44×44 pt (iOS) and 48×48 dp (Android).

### 3.4 Icons

`expo-symbols` (SF Symbols) on iOS, with Material Symbols as the fallback on Android and web, using the same meaning on both:

| Meaning | SF Symbol | Material |
|---|---|---|
| Active | `checkmark.shield` | `verified_user` |
| Expiring soon | `clock.badge.exclamationmark` | `schedule` |
| Expired | `xmark.shield` | `gpp_bad` |
| Receipt | `doc.text.image` | `receipt_long` |
| Camera | `camera` | `photo_camera` |
| Add | `plus` | `add` |
| Covered | `checkmark.circle` | `check_circle` |
| Not covered | `minus.circle` | `do_not_disturb_on` |

Category icons: electronics `desktopcomputer`/`devices`, appliance `washer`/`local_laundry_service`, furniture `sofa`/`chair`, vehicle `car`/`directions_car`, other `shippingbox`/`inventory_2`.

## 4. Components

All live in `src/components/ui` (generic) or `src/features/warranties/components` (specific to warranties).

### Generic (`components/ui`)
| Component | Notes |
|---|---|
| `Screen` | Safe-area wrapper, side padding, `MaxContentWidth` on web, scroll optional |
| `Button` | Variants: `primary` (filled), `secondary` (tinted `backgroundElement`), `destructive` (danger text), `plain` (link-style). Has a loading state (spinner, stays the same width). Full width on mobile. |
| `TextField` | Label above, helper/error text below, 48 px tall, `border` → `primary` on focus, `danger` on error |
| `DateField` | Native date picker on iOS/Android, `<input type="date">` on web |
| `Select` | Native menu or sheet. Used for category and warranty length |
| `Badge` | icon + label, tinted background (`successBg` etc.) |
| `Card` | `backgroundElement`, radius `md`, padding `three`, pressable with the `backgroundSelected` pressed state |
| `EmptyState` | icon, title, one line of body text, primary action |
| `Skeleton` | pulsing placeholder blocks (Reanimated) that respect Reduce Motion |
| `Toast` | bottom of screen, auto-dismisses after 4 s, action button optional (for example "Undo") |

### Warranty-specific (`features/warranties/components`)
| Component | Notes |
|---|---|
| `StatusBadge` | Active / Expiring in N days / Expired. Picks icon, colour and text from `getStatus()` |
| `WarrantyCard` | Row: category icon · product name + brand · expiry line · `StatusBadge`. Thumbnail of the first receipt on the right |
| `ExpiryProgress` | Thin bar showing how much of the warranty period has passed; colour follows status |
| `ProofPicker` | Grid of attached files and an "Add proof" tile. Opens a sheet: Take photo / Choose photo / Choose file. Required marker; error state if empty on save |
| `CoverageEditor` | Two lists, "Covered" and "Not covered", each with chips you can add or remove, plus a "Use template" action per category and a notes field |
| `CoverageList` | Read-only version for the detail screen, with ✓ and – icons |
| `ReminderPicker` | Chips: 60 / 30 / 14 / 7 days before, plus On expiry day. Multi-select; 30, 7 and expiry day are selected by default |

## 5. Screens

Layouts below are for mobile. On the web, content is centred at a maximum of 800 px, and Home becomes a two-column grid at ≥ 768 px.

### 5.1 Login
```
┌─────────────────────────┐
│                         │
│        [ logo ]         │
│    Never miss a         │
│    warranty again.      │
│  Keep receipts and get  │
│  reminded before they   │
│  expire.                │
│                         │
│ [ G  Continue with Google ]│
│                         │
│  Free & open source ·   │
│  Privacy · GitHub       │
└─────────────────────────┘
```
- One action only. The Google button follows Google's branding rules (white or dark variant, official "G" logo).
- When mock auth is on, a small "Dev mode: mock sign-in" note appears under the button.

### 5.2 Home
```
┌─────────────────────────┐
│ Warranties          [+] │  largeTitle; + on iOS header, FAB on Android
│ [ Search products…    ] │
│ (All)(Active)(Expiring)(Expired)  filter chips
│                         │
│ EXPIRING SOON           │  only shown if any
│ ┌─────────────────────┐ │
│ │ 📺 Samsung TV    [▢]│ │
│ │ Expires in 12 days  │ │
│ │ ⏱ Expiring soon     │ │
│ └─────────────────────┘ │
│ ALL WARRANTIES (8)      │
│ ┌─────────────────────┐ │
│ │ 💻 MacBook Air   [▢]│ │
│ │ Until 14 Mar 2027   │ │
│ │ ✓ Active            │ │
│ └─────────────────────┘ │
│   …                     │
├─────────────────────────┤
│   Home        Settings  │  native tabs
└─────────────────────────┘
```
- Sorted by expiry date, soonest first. Expired warranties go at the bottom, dimmed.
- Pull to refresh. Swipe a card to delete (iOS) or long-press for a menu (Android and web), with confirmation.
- **Empty state:** receipt illustration, "No warranties yet", "Snap a receipt to start tracking.", [Add warranty].

### 5.3 Add / Edit Warranty (modal)
One scrolling form, with the camera first:
```
┌─────────────────────────┐
│ Cancel   New warranty  Save │
│                         │
│ PROOF OF PURCHASE *     │
│ [▢ receipt][ + Add ]    │
│ Receipt or invoice.     │
│                         │
│ PRODUCT                 │
│ Name *     [          ] │
│ Brand      [          ] │
│ Model      [          ] │
│ Serial no. [          ] │
│ Category   [Electronics▾]│
│                         │
│ PURCHASE                │
│ Date *     [26 Sep 2026]│
│ Store      [          ] │
│ Price      [RM        ] │
│                         │
│ WARRANTY                │
│ Length *   [12 months ▾]│
│ Expires    26 Sep 2027  │  auto; tap "Change" to set it manually
│                         │
│ COVERAGE   [Use template]│
│ Covered     (Parts ×)(Labour ×)(+)│
│ Not covered (Water damage ×)(+)   │
│ Notes      [          ] │
│                         │
│ REMIND ME               │
│ (60d)(30d✓)(14d)(7d✓)(Expiry day✓)│
└─────────────────────────┘
```
- **Save** stays disabled until the required fields and **at least one proof** are there. Tapping the disabled Save scrolls to the first missing field and shows its error.
- Opening "Add" goes straight to the choice sheet (Take photo / Choose photo / Choose file) so the receipt is captured first.
- The length picker offers: 6, 12, 24, 36, 60 months and Custom.
- Choosing a category fills in the coverage template only if coverage is still empty. It never overwrites what the user typed.
- Cancel with unsaved changes asks: "Discard changes?"

### 5.4 Warranty Detail
```
┌─────────────────────────┐
│ ‹ Back            Edit  │
│ [ receipt thumbnail ]   │  tap → full-screen viewer
│ Samsung 55" TV          │  title
│ Samsung · QA55Q60       │
│ ⏱ Expires in 12 days    │  StatusBadge
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 97%    │  ExpiryProgress
│                         │
│ WHAT'S COVERED          │
│ ✓ Parts                 │
│ ✓ Labour                │
│ – Accidental damage     │
│ – Water damage          │
│ Notes: Panel 2 yrs…     │
│                         │
│ DETAILS                 │
│ Purchased   26 Sep 2025 │
│ Store       Harvey Norman│
│ Price       RM 2,999    │
│ Serial      ABC123      │
│ Reminders   30d, 7d, day│
│                         │
│ [ Delete warranty ]     │  destructive, confirm
└─────────────────────────┘
```
- "What's covered" sits above the details because that's the question users arrive with.
- Long-press the serial number to copy it.

### 5.5 Receipt Viewer (full-screen modal)
- Black background, pinch to zoom, swipe between files, swipe down to close.
- PDFs open in the system viewer (native) or a new tab (web).
- Toolbar: Close · page "1 / 3" · Share.

### 5.6 Settings
Grouped list:
- **Account:** avatar, name, email (from Google).
- **Notifications:** Push on/off (native only), Email on/off, default reminder times.
- **Appearance:** System / Light / Dark.
- **About:** version, GitHub repo, license, privacy policy.
- **Sign out.** Then, separated at the bottom: **Delete account** (red, confirm by typing DELETE).

## 6. States & Feedback

| State | Treatment |
|---|---|
| Loading list | 3 skeleton cards |
| Loading detail | skeleton for the header and thumbnail |
| Error | inline message + Retry; the rest of the screen stays usable |
| Saving | Save button spinner; form inputs disabled |
| Save failed | toast "Couldn't save. Your changes are still here." + Retry; form content kept |
| Deleted | toast "Warranty deleted" + Undo (5 s) |
| Offline | thin banner "Offline. Showing saved data." |
| Notifications off | a card on Home once: "Turn on reminders" → system settings |

## 7. Motion

- Use native transitions for navigation (stack push, modal sheet). No custom screen transitions.
- Small animations: badge colour fade, card press scale 0.98, skeleton pulse, toast slide.
- Keep durations between 150 and 250 ms.
- **Respect Reduce Motion** (Reanimated `useReducedMotion`): turn off scale and pulse effects.

## 8. Accessibility

- Every icon-only control has an `accessibilityLabel`, e.g. "Add warranty" or "Receipt 1 of 2".
- `StatusBadge` reads out in full: "Expiring soon, 12 days left".
- `WarrantyCard` is a single accessible element with a combined label, not five separate stops.
- Focus order follows the visual order. Form errors are announced (`accessibilityLiveRegion` / `AccessibilityInfo.announceForAccessibility`).
- The web gets a visible focus ring (`primary`, 2 px) and full keyboard navigation.
- Contrast is AA for all token pairs (§3.1). Tested in both themes and at 200% text size.

## 9. Content & Formatting

- Dates use the device locale (`Intl.DateTimeFormat`), e.g. "26 Sep 2027". Relative wording only for the next 60 days: "Expires in 12 days", "Expires today", "Expired 3 days ago".
- Currency uses the device locale; the currency code is saved with the price.
- Mark required fields with `*` and say "Required" in the error, e.g. "Add a proof of purchase to save".
- Sentence case everywhere ("Add warranty", not "Add Warranty").

## 10. Platform Notes

| | iOS | Android | Web |
|---|---|---|---|
| Tabs | NativeTabs (liquid glass on iOS 26) | NativeTabs (Material) | `app-tabs.web.tsx` top/side nav |
| Add action | header `+` | FAB bottom-right | header button |
| Modals | page sheet | full-screen | centred dialog, max 640 px |
| Row actions | swipe | long-press menu | hover ⋯ menu |
| Camera | yes | yes | hidden; file upload only |
| Push reminders | yes | yes | no (email + in-app) |

## 11. Open Design Questions

1. Logo and app icon for Jaminly. The icon currently comes from the Expo template.
2. Illustration style for empty states: line icons (cheap, consistent) or custom illustrations?
3. Should Home group warranties by category instead of by expiry?
4. Should there be onboarding screens, or just the empty-state prompt? (Recommendation: empty state only.)
