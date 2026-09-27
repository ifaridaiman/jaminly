# Jaminly Website — Design

Status: Draft v0.1 · Last updated 2026-09-27 · Related: [PRD](./PRD.md), [App DESIGN](../../warranty-ui/docs/DESIGN.md)

The visual design for the Jaminly marketing site and legal pages. It follows the **`design-taste-frontend`** skill ("taste skill", vendored at [`.claude/skills/design-taste-frontend/SKILL.md`](../../../.claude/skills/design-taste-frontend/SKILL.md)). Section numbers such as "taste §4.7" point into that file. Brand decisions (name, voice, colour, logo) come from the app's [DESIGN §2](../../warranty-ui/docs/DESIGN.md#2-brand) and are not redefined here.

---

## 1. Design Read (taste §0)

> **Reading this as:** a consumer mobile-app landing page for everyday people in Malaysia and beyond who buy phones, laptops and appliances, with a calm, tidy, trust-first language, leaning toward native Astro + Tailwind v4 on the app's own tokens, a real app screenshot as the hero, and restrained CSS-only motion.

Why:
- **Page kind:** landing page + legal pages. Greenfield (no existing site), but the brand already exists in the app, so brand tokens are fixed input (taste §0.A.5).
- **Vibe words from the brand:** "trustworthy, tidy, quietly helpful. Like a well-organised drawer" and "Calm, not alarming" (App DESIGN §1–2).
- **Audience:** non-technical consumers first, developers second. They care that it's free, simple and safe with their receipts.
- **Quiet constraints:** the site holds a privacy policy and handles personal-data questions. Trust and legibility beat spectacle (taste §0.A.6).

## 2. Dials (taste §1)

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | **6** | Between "SaaS landing" (7) and "trust-first" (3–4). Asymmetric hero and a bento grid, but aligned to a clear 12-column grid. No masonry or artsy chaos. |
| `MOTION_INTENSITY` | **4** | "Fluid CSS" band. Motion exists (hero entrance, scroll reveals, button feedback) but never draws attention to itself, matching "calm, not alarming". |
| `VISUAL_DENSITY` | **4** | "Daily app" spacing: `py-20`–`py-28` sections, generous but not gallery-empty. |

These values are fixed for the whole site. Legal pages use the same tokens with `DESIGN_VARIANCE` 2 (a single reading column).

## 3. Design System & Tokens (taste §2, §4.2, §8)

**System choice:** no official design system fits (taste §2.A: none of Material, Fluent, Primer, etc. is "Jaminly"). This is an **aesthetic build** (taste §2.B): native Astro components, Tailwind v4 utilities and CSS variables. No component library is installed.

### 3.1 Colour

The site reuses the app's tokens with two adjustments the taste skill requires:
1. **No pure `#FFFFFF` / `#000000`** (taste §8.B, §9.A). The web uses off-white and off-black. The app keeps its values; only the website differs.
2. **One accent** (taste §4.2): the brand blue `primary`. The LILA rule's brand override applies: blue is the existing brand colour, so it stays, used flat (no glows, no blue-to-purple gradients).

Neutrals stay in the app's cool grey family (one palette, no warm greys).

| Token (CSS var) | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFAFB` | `#0B0C0E` | page background |
| `--bg-elevated` | `#F0F0F3` | `#18191B` | bento cells, code blocks, FAQ rows |
| `--bg-selected` | `#E0E1E6` | `#2E3135` | hover on neutral surfaces |
| `--text` | `#111113` | `#EDEEF0` | headings, body |
| `--text-secondary` | `#60646C` | `#B0B4BA` | subtext, captions, metadata |
| `--border` | `#D9D9E0` | `#3A3D42` | dividers, input borders |
| `--primary` | `#0969DA` | `#4C9EFF` | CTAs, links, focus ring, the tinted bento cell |
| `--primary-hover` | `#0858B8` | `#79B8FF` | CTA hover |
| `--on-primary` | `#FFFFFF`* | `#0B0C0E` | text on `--primary` |
| `--primary-soft` | `#E6F0FC` | `#0F2138` | tinted bento cell, privacy band background |
| `--success` / `--warning` / `--danger` | as App DESIGN §3.1 | as App DESIGN §3.1 | only inside app screenshots and the status legend in the reminders cell; never decorative |

\* White text on a saturated blue button is allowed: the "no pure white" rule is about large surfaces, and white keeps CTA contrast at 5.1:1.

Contrast checks (to be verified with a tool during W1): `--text` on `--bg` ≥ 15:1 in both modes; `--text-secondary` on `--bg` and `--bg-elevated` ≥ 4.5:1; `--on-primary` on `--primary` ≥ 4.5:1 in both modes.

**Theme:** auto, from `prefers-color-scheme`. One theme for the whole page; sections never invert (taste §4.11). The privacy band uses `--primary-soft`, a tint within the same theme, not an inverted section. No manual toggle in v1: nothing about the brand is lost in either mode.

### 3.2 Typography

The app uses system fonts so it has nothing to load. The website is different: it is the first impression and the taste skill discourages generic default sans stacks (taste §4.1). One self-hosted variable family:

- **Plus Jakarta Sans** (variable, 400–800), via `@fontsource-variable/plus-jakarta-sans`. Designed by Tokotype in Jakarta: a Southeast Asian typeface for a Malay-named brand, friendly geometric shapes without being playful. OFL licence.
- No serif anywhere (taste §4.1 serif discipline: nothing in the brand calls for one).
- No mono font. The one command snippet in the open-source section uses `ui-monospace, SFMono-Regular, Menlo, monospace`.
- Emphasis inside a headline uses the same family at a heavier weight, never a second family.
- Numbers (dates, "12 days") use `font-variant-numeric: tabular-nums`.

| Style | Size (mobile → desktop) / line height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 40 → 60 px / 1.05 | 750 | -0.03em | hero `<h1>` only |
| `h2` | 30 → 40 px / 1.15 | 700 | -0.02em | section headlines |
| `h3` | 20 → 22 px / 1.3 | 650 | -0.01em | bento cell titles, FAQ questions |
| `lead` | 18 → 20 px / 1.55 | 400 | 0 | hero subtext, section intros |
| `body` | 16 → 17 px / 1.65 | 400 | 0 | body text, max width 65ch |
| `small` | 14 px / 1.5 | 500 | 0 | captions, footer, metadata |
| `eyebrow` | 13 px / 1.4 | 600 | 0.08em uppercase | rationed, see §5 |

### 3.3 Spacing, layout, shape

- **Container:** `max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8`. Legal pages: a 65ch reading column plus a 240 px sticky table of contents on `lg`.
- **Grid:** 12 columns on `lg`, collapses to a single column below `md` (768 px) for every section (taste §4.7 mobile collapse, §7 mobile override).
- **Section rhythm:** `py-20 md:py-28`. Hero top padding capped at `pt-24` on desktop (taste §4.7).
- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).
- **Viewport:** hero uses `min-h-[100dvh]` minus the header, never `h-screen`.
- **Shape lock (taste §4.4), same scale as the app:**
  - `8px` badges, inputs, code blocks
  - `12px` buttons
  - `20px` bento cells, screenshot frames, FAQ container
  No pills and no sharp corners anywhere else.
- **Elevation:** flat, as in the app. Surfaces separate by `--bg-elevated`, not shadows. The only shadow is on phone screenshots: `0 24px 60px -20px` tinted with `--primary` at 20% opacity (taste §4.4: tinted, never pure black).
- **Z-index scale:** `header 40`, `skip-link 50`. Nothing else uses z-index.

### 3.4 Icons (taste §3.C)

- **Phosphor**, "regular" weight only, via `astro-icon` + `@iconify-json/ph`. Rendered to inline SVG at build time, so no JavaScript is needed.
- One family on the site. The app uses SF Symbols / Material; the website doesn't need to match glyph-for-glyph, only meaning.
- No hand-drawn icons. The Jaminly logo is the only custom SVG, taken as-is from `warranty-ui/assets/logo/jaminly-mark.svg`.
- No emoji.

| Meaning | Phosphor icon |
|---|---|
| Receipt vault | `ph:receipt` |
| Reminders | `ph:bell-ringing` |
| Coverage | `ph:shield-check` |
| Sync | `ph:devices` |
| Open source | `ph:github-logo` |
| Privacy pledges | `ph:prohibit` (no ads), `ph:hand-coins` (never sold), `ph:lock-key` (encrypted), `ph:trash` (delete anytime) |

## 4. Components

Astro components in `src/components/`, all server-rendered with no client JS unless noted.

| Component | Notes |
|---|---|
| `BaseLayout.astro` | `<html lang>`, `<head>` via `Seo.astro`, skip link, header, `<main>`, footer, font preload |
| `Seo.astro` | title, description, canonical, OG/Twitter, JSON-LD slot (PRD §6) |
| `Header.astro` | logo + wordmark left, anchor links centre-right, one primary CTA right. Height 64 px, one line at `lg` (taste §4.7). Sticky with `--bg` at 85% opacity + `backdrop-blur-md`, solid under `prefers-reduced-transparency`. Below `md`: logo + CTA only, anchors move into a `<details>` disclosure menu (no JS). |
| `Footer.astro` | three short link groups + © line. No version strings, no locale strip (taste §9.F). |
| `Button.astro` | `variant: primary \| secondary`, renders `<a>`. Label ≤ 3 words, never wraps (`whitespace-nowrap`). `:active` → `scale(0.98)`. Focus ring 2 px `--primary`, offset 2 px. |
| `PhoneShot.astro` | real app screenshot in a simple rounded frame (20 px radius, 1 px `--border`), `<Picture>` with AVIF/WebP. Light and dark variants swapped via `<source media="(prefers-color-scheme: dark)">`. |
| `BentoCell.astro` | `tone: plain \| tinted \| image`, `span` props. |
| `Faq.astro` | native `<details>/<summary>` list, animated open with CSS `interpolate-size` where supported; emits `FAQPage` JSON-LD from the same data. |
| `LegalLayout.astro` | reading column, "Last updated" line, generated table of contents from headings, "Back to top" link. |
| `StoreBadges.astro` | official Apple / Google badge SVGs (their brand assets, unmodified) once listings exist; hidden until then. |

## 5. Page Layouts

### 5.1 Home — section map

Eight sections, six different layout families (taste §4.7 requires ≥ 4 and no repeats), at most 3 eyebrows (⌈8 / 3⌉), no three-equal-cards row (taste §9.C), and no more than two image+text splits in a row.

| # | Section | Layout family | Eyebrow |
|---|---|---|---|
| 1 | Hero | Asymmetric split (7/5) | none |
| 2 | Problem | Editorial statement (large type, no asset) | none |
| 3 | Features | Bento grid, 5 cells | ✅ "What it does" |
| 4 | How it works | Sticky-left heading + stepped screenshots | none |
| 5 | Privacy promise | Tinted band, 2×2 pledge grid | none |
| 6 | Open source | Split: copy + real command block | ✅ "Open source" |
| 7 | FAQ | Single-column accordion | none |
| 8 | Closing CTA | Centred short statement | none |

Eyebrows used: 2 of the allowed 3.

### 5.2 Hero (HOME-1)

```
┌──────────────────────────────────────────────────────────────┐
│ [logo] Jaminly        Features  Privacy  FAQ  GitHub  [Get app]│  64px
├──────────────────────────────────────────────────────────────┤
│                                           ┌──────────┐        │
│  Keep every receipt.                      │          │        │
│  Claim every warranty.                    │  real    │        │
│                                           │  Home    │        │
│  Snap your receipt, and Jaminly reminds   │  screen  │        │
│  you before the warranty runs out.        │ (mock    │        │
│  Free and open source.                    │  data)   │        │
│                                           │          │        │
│  [Get the app]  [View on GitHub]          └──────────┘        │
│   cols 1–7                                  cols 8–12         │
└──────────────────────────────────────────────────────────────┘
```

- Left-aligned, never centred (taste §4.3, variance 6 > 4).
- Max 4 text elements: headline, subtext, two CTAs. No eyebrow, no trust strip, no "free forever" tagline under the buttons (taste §4.7 hero stack).
- Headline: 2 lines max on desktop, 6 words per line max. Subtext ≤ 20 words (the draft above is 17).
- Visual: the real Home screen from `warranty-ui` with sample warranties (one Active, one Expiring soon, one Expired) so all three statuses show. Slightly overlapping a second screenshot (Warranty Detail) behind it at 90% scale, offset by `-2rem` (variance 6 overlap move).
- Mobile: copy first, screenshot below at 80% width, centred; CTAs stack full-width.

### 5.3 Problem (HOME-2)

Editorial statement, one column, `h2`-sized text across three short lines, each a real pain from App PRD §2:

> Receipts fade. Warranties expire quietly. And most people never check what's actually covered.

`--text-secondary` for the first two sentences, `--text` for the last to give it weight. No icons, no cards. This is the only section with no visual asset, on purpose: it breaks the rhythm between the hero and the bento.

### 5.4 Features bento (HOME-3)

Five features → exactly five cells (taste §4.7 bento cell count). Desktop grid, 12 columns:

```
┌───────────────────────────────┬───────────────────┐
│ Receipt vault      (span 7,   │ Reminders  (span 5)│
│ image: receipt viewer shot)   │ status legend      │
│                               │ Active/Soon/Expired│
├──────────────┬────────────────┴───┬───────────────┤
│ Coverage     │ Phone and web       │ Open source   │
│ (span 4,     │ (span 4, image:     │ (span 4,      │
│  chips shot) │  phone + browser)   │  tinted)      │
└──────────────┴─────────────────────┴───────────────┘
```

- Background diversity (taste §4.7): cell 1 and 4 carry real screenshots, cell 5 is `--primary-soft` tinted, cells 2 and 3 are `--bg-elevated` with a real UI crop (status badges, coverage chips) cut from the app's screenshots, not rebuilt with divs.
- Each cell: `ph:` icon, `h3` (≤ 4 words), one sentence (≤ 20 words).
- Mobile: single column in the same order.

### 5.5 How it works (HOME-4)

Sticky left column (`lg:sticky top-24`) with the `h2` "Three steps, under a minute". The right column scrolls through three steps, each a screenshot + a verb-noun label. No "Step 1 / Step 2" labels (taste §9.F):

1. **Snap the receipt**: Add Warranty screen with the camera open.
2. **Set the warranty**: the form with warranty length and coverage filled in.
3. **Get reminded**: a notification screenshot / Expiring soon section.

Mobile: sticky is dropped; heading then steps stacked.

### 5.6 Privacy promise (HOME-5)

Full-width band on `--primary-soft` (a tint, not an inverted section). `h2` "Your receipts stay yours." Then a 2×2 grid of pledges, each an icon + one short line:

- No ads. Ever.
- We never sell your data.
- Receipts are private and encrypted.
- Delete everything, anytime.

Below: a text link "Read the privacy policy". Mobile: 1 column.

### 5.7 Open source (HOME-6)

Split 5/7: left copy ("Free, open source, and yours to host." + two sentences + GitHub link); right a real, copyable command block:

```bash
git clone https://github.com/ifaridaiman/jaminly
pnpm install
pnpm dev
```

This is real content, not a fake terminal (taste §9.E): no window chrome, no fake prompt, no fake output. The copy button is the only client JS on the page (a tiny inline script), and the block works without it.

### 5.8 FAQ (HOME-7)

Single column, `max-w-[65ch]`, `<details>` rows separated by one `border-b` each (only one rule per row, taste §9.F). 5–7 questions from PRD HOME-7. First question open by default.

### 5.9 Closing CTA (HOME-8)

Short centred statement (taste §4.3 allows centred for a closing message): "Your next receipt is the first one." + the same primary button as the hero. Same label, same intent (taste §4.5: one label per intent).

### 5.10 Legal pages

- Header and footer as Home. No hero.
- `<h1>` + "Last updated 27 September 2026" in `small`.
- "In short" summary box on `--bg-elevated`, 8 px radius.
- Reading column at 65ch, `body` style, `h2` for sections with anchor links on hover/focus.
- Sticky table of contents on `lg`, hidden below.
- Tables allowed (e.g. data we collect → why → how long), with horizontal scroll inside the table only, never the page.
- `/delete-account` uses a numbered list for the in-app steps: the only place a numbered list appears on the site.

## 6. Imagery (taste §4.8)

- **App screenshots are the main visuals.** Captured with Playwright from `warranty-ui` running on web (`EXPO_PUBLIC_USE_MOCK_API=true`, `EXPO_PUBLIC_MOCK_AUTH=true`) at a 390×844 viewport, in light and dark mode. Sample data uses realistic Malaysian products and stores (e.g. "Samsung Galaxy S25, Senheng", "Panasonic inverter aircond, Harvey Norman"), not "Product 1" or "Acme" (taste §9.D).
- **No div-built fake UI** (taste §9.E). Every product visual is a real screenshot or a real crop of one.
- **Lifestyle photography (optional, W3):** two slots, marked in code as `<!-- TODO: image -->` until provided (taste §4.8 last-resort rule):
  1. Problem section alternative: a faded thermal receipt on a table, 1600×1000.
  2. OG image background: a hand holding a phone next to a boxed appliance, 1200×630.
  No image-generation tool is available in this environment, so these need to be generated or supplied separately.
- **OG images:** built at compile time from an Astro endpoint (logo + page title on `--bg`), so every page has one without manual design work.
- No captions on images, no tags overlaid on images (taste §9.F).

## 7. Motion (taste §5, §6, band 4–7)

CSS only, no animation library. Every animation has a stated reason (taste §5 "motion must be motivated"):

| Where | What | Why |
|---|---|---|
| Hero | Headline, subtext, CTAs fade up 16 px with a 60 ms stagger; screenshot fades up 120 ms later. 500 ms `cubic-bezier(0.16, 1, 0.3, 1)`. | Hierarchy: text first, then the product. |
| Bento cells, steps, pledges | Fade up 24 px as they enter the viewport, using CSS `animation-timeline: view()` inside `@supports`. Browsers without support show content immediately. | Storytelling: reveal features in reading order. |
| Buttons | `:hover` colour shift; `:active` `scale(0.98)`. 150 ms. | Feedback. |
| FAQ | Smooth height on open via `interpolate-size: allow-keywords` where supported. | State transition. |

Rules:
- Only `transform` and `opacity` are animated.
- Everything sits inside `@media (prefers-reduced-motion: no-preference)`. With reduced motion, content is static and fully visible.
- No scroll listeners, no parallax, no marquee, no infinite loops, no scroll cues.

## 8. Copy Rules

- Voice from App DESIGN §2: plain and short. "Expires in 12 days", not "Your warranty is about to reach its expiration date!".
- **No em-dashes or en-dashes in any visible site copy** (taste §9.G). Use periods, commas or colons. (These design docs aren't site copy and are exempt.)
- No filler verbs: "elevate", "seamless", "unleash", "revolutionise" (taste §9.D).
- Numbers only when true. "Under a minute to add a warranty" is a product goal (App PRD §3), so it can be used once the app meets it. No invented user counts or ratings.
- One label per intent: **"Get the app"** (download / web app), **"View on GitHub"** (source). No "Download now" or "Try it free" elsewhere on the page.
- Spelling: British/Malaysian English ("colour", "organise"), matching the app.

## 9. Accessibility

- Skip-to-content link, first focusable element.
- Visible 2 px `--primary` focus ring on every interactive element.
- Colour is never the only signal (App DESIGN principle 5): status legend in the reminders cell shows icon + text.
- All screenshots have descriptive `alt` ("Jaminly home screen listing three warranties: one active, one expiring in 12 days, one expired").
- Tap targets ≥ 44×44 px.
- Tested with keyboard only, VoiceOver (iOS Safari) and 200% zoom.

## 10. Pre-flight Checklist (taste §14, adapted)

Run before W4 sign-off. Items that don't apply to this site (GSAP, Motion library, forms, logo walls, testimonials) are left out on purpose.

- [ ] Design read and dials unchanged from §1–2, or updated here with reasons
- [ ] Zero `—` or `–` in visible copy (grep `dist/` for both)
- [ ] One theme per page, auto light/dark, both modes checked
- [ ] One accent (`--primary`) everywhere; status colours only in screenshots and the legend
- [ ] Shape lock: 8 / 12 / 20 px only
- [ ] Every CTA ≥ 4.5:1 contrast, one line at desktop, labels ≤ 3 words
- [ ] One label per CTA intent
- [ ] Hero: ≤ 2-line headline, ≤ 20-word subtext, CTAs visible without scrolling at 1280×720 and 390×844, top padding ≤ `pt-24`
- [ ] Hero has ≤ 4 text elements
- [ ] Eyebrows ≤ 3 on Home
- [ ] No section layout family repeated; ≤ 2 consecutive image+text splits
- [ ] Bento: exactly 5 cells, ≥ 2 with real visual variation
- [ ] No div-built fake UI, no hand-drawn icons, no emoji
- [ ] No scroll cues, version labels, decorative dots, locale strips, section numbers
- [ ] Copy self-audit: every string re-read, no filler verbs, no invented numbers
- [ ] Reduced motion: nothing moves; content fully visible
- [ ] Nav on one line at `lg`, height ≤ 80 px
- [ ] Mobile: every multi-column section collapses to one column below 768 px, no horizontal scroll
- [ ] Lighthouse ≥ 95 (Performance, Accessibility, Best Practices, SEO) on Home and `/privacy`

## 11. Where This Deviates From the Taste Skill

The skill's defaults assume React/Next. This site is Astro, so some rules are applied in spirit:

| Skill default | This site | Why |
|---|---|---|
| React / Next.js + Motion (`motion/react`) | Astro components + CSS animations | Zero client JS is the point of choosing Astro for SEO. At `MOTION_INTENSITY` 4 the skill's own band says "Fluid CSS" is enough. |
| Fonts via `next/font` | `@fontsource-variable` self-hosted | Same goal (self-hosted, `swap`), Astro-native. |
| Icons via `@phosphor-icons/react` | Phosphor via `astro-icon` | Same family, rendered at build time. |
| No pure white | White text on primary buttons | Contrast on the brand blue; large surfaces are still off-white. |
| Picsum placeholders when no images | Real app screenshots + TODO slots | Picsum photos are unrelated stock; real screenshots show the actual product. |

## 12. Open Design Questions

1. **Hero headline:** "Keep every receipt. Claim every warranty." is the working draft. Alternatives: "Never miss a warranty claim." / "Your warranties, sorted."
2. **Store badges vs. web app** as the hero CTA before the store launch (PRD §5.1).
3. **Lifestyle photos:** supply them, or keep the site screenshot-only (§6)?
4. **Bahasa Melayu:** if added, check that the hero headline still fits in 2 lines (Malay strings run ~20–30% longer).
