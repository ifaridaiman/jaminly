# PRD — Jaminly Website

| | |
|---|---|
| **Status** | Draft v0.1 (planning, not built yet) |
| **Owner** | Farid Aiman |
| **Last updated** | 2026-09-29 |
| **App** | `apps/web` (package `jaminly-web`) |
| **Stack** | Astro 7, static output |
| **Domain** | `https://jaminly.app` |
| **Contact** | app@jaminly.app |
| **Hosting** | Vercel (later). Local development only for now, see §9.1 |
| **Languages** | English (default) and Bahasa Melayu, see §5.6 |
| **Related** | [DESIGN](./DESIGN.md) · [App PRD](../../warranty-ui/docs/PRD.md) · [App DESIGN](../../warranty-ui/docs/DESIGN.md) |

---

## 1. Summary

The public website for Jaminly. It has two jobs:

1. **Promote the app.** Explain what Jaminly does, rank in search for warranty- and receipt-tracking queries, and send visitors to the app stores, the web app, or GitHub.
2. **Host the legal pages the app and stores need.** A privacy policy, terms of use and an account-deletion page, each at a stable public URL. The app's Settings screen links here (`PRIVACY_URL` in `warranty-ui/src/constants/links.ts`), and so do the App Store and Google Play listings.

The site is built with Astro because it outputs static HTML with no JavaScript by default. That gives fast pages, good Core Web Vitals and fully crawlable content, all of which help SEO.

## 2. Goals & Non-goals

### Goals
1. **Get found.** Rank for "warranty tracker app", "receipt organizer app", "warranty reminder" and Malay equivalents ("jejak waranti", "simpan resit"). Every page is indexable, has unique metadata and structured data.
2. **Convert.** A visitor understands what Jaminly does from the hero alone and can reach a download or the web app in one click.
3. **Meet store requirements.** Public URLs for the privacy policy (Apple and Google), account deletion (Google Play) and terms.
4. **Be honest about data.** The privacy policy matches what the app actually collects (App PRD §7 and §10), in plain language.
5. **Fast and accessible.** Lighthouse ≥ 95 in every category, WCAG AA, works without JavaScript.
6. **Look like Jaminly.** Same brand, colours and logo as the app, designed with the `design-taste-frontend` skill (see [DESIGN](./DESIGN.md)).

### Non-goals (v1)
- Any backend. The site is fully static: no server code, API routes, forms, database or serverless functions. Every page is plain HTML built at compile time.
- Accounts, sign-in or any app functionality on the website. That lives in the web app.
- A CMS. Content is Markdown/MDX in the repo, edited by pull request.
- Third-party analytics, ad pixels or cookie banners. The site sets no cookies (see §8).
- A blog. The structure leaves room for one (a content collection) in v2.
- Paid ads landing pages or A/B testing.

## 3. Audience

| Visitor | Arrives from | Wants to know |
|---|---|---|
| **Searcher** | Google: "how to keep track of warranties", "receipt app" | Does this solve my problem? Is it free? |
| **Store browser** | App Store / Play listing → "Website" link | Is this legit? Who makes it? |
| **Privacy checker** | Store listing, in-app Settings | What data is collected and how do I delete it? |
| **Developer** | GitHub, Hacker News, Reddit | Is it really open source? Can I self-host? |

## 4. Information Architecture

```
/                   Home (landing page)
/privacy            Privacy policy
/terms              Terms of use
/delete-account     How to delete your account and data
/404                Not found

/ms/                Home (Bahasa Melayu)
/ms/privacy         Dasar privasi
/ms/terms           Terma penggunaan
/ms/delete-account  Padam akaun

/sitemap-index.xml  generated, lists both languages
/robots.txt
```

- Header nav: **Features** (anchor), **Privacy** (anchor to the privacy section), **FAQ** (anchor), **GitHub** (external), a language switcher (EN / BM), plus one primary CTA.
- Footer: Privacy policy, Terms, Delete account, GitHub, License, contact email (app@jaminly.app), © year.
- URLs are lowercase, no trailing slash, no file extensions. Once published, slugs never change: the app and store listings link to them.
- Slugs stay in English in every language (`/ms/privacy`, not `/ms/privasi`), so a page's address differs only by the language prefix.

## 5. Page Requirements

### 5.1 Home (`/`)
Section order and content. The layout of each section is in [DESIGN §5](./DESIGN.md#5-page-layouts).

| ID | Section | Content | Priority |
|---|---|---|---|
| HOME-1 | Hero | Headline, one-line subtext (≤ 20 words), primary CTA (get the app), secondary CTA (GitHub), a real app screenshot | P0 |
| HOME-2 | Problem | The three pains from App PRD §2: fading receipts, forgotten expiry dates, not knowing what's covered | P0 |
| HOME-3 | Features | Receipt vault, expiry reminders (push + email), coverage at a glance, same data on phone and web, open source | P0 |
| HOME-4 | How it works | Snap the receipt → set the warranty length → get reminded before it expires | P0 |
| HOME-5 | Privacy promise | Four plain pledges (no ads, no selling data, private receipts, delete everything anytime) + link to `/privacy` | P0 |
| HOME-6 | Open source | MIT license, self-hostable, link to the repo and self-hosting guide | P1 |
| HOME-7 | FAQ | 5–7 real questions (Is it free? Which platforms? Where are my receipts stored? What if I lose my phone? Can I self-host? How do I delete my data?) | P0 |
| HOME-8 | Closing CTA | Same primary CTA as the hero | P1 |

Primary CTA behaviour:
- **Before store launch:** "Open web app" (links to the hosted web app) or, if there is no hosted instance, "View on GitHub" becomes the only CTA.
- **After store launch:** official App Store and Google Play badges, with the web app as a text link. The page detects nothing: all options are always shown, no user-agent sniffing.

### 5.2 Privacy policy (`/privacy`)

| ID | Requirement | Priority |
|---|---|---|
| LEGAL-1 | Written in Markdown, one file per language (`src/content/legal/en/privacy.md`, `src/content/legal/ms/privacy.md`) with a visible "Last updated" date and a version history note at the bottom. | P0 |
| LEGAL-2 | Plain language first: a short "In short" summary at the top, then the detailed sections. | P0 |
| LEGAL-3 | Linkable headings (`/privacy#data-we-collect`) and an in-page table of contents. | P0 |
| LEGAL-4 | Covers every item in §7 below. | P0 |
| LEGAL-5 | Reviewed by a person with legal knowledge before the app launches in stores. | P0 (launch gate) |
| LEGAL-6 | Each translated legal page says the English version prevails if the two differ, and links to it. | P0 |

### 5.3 Terms (`/terms`)
Short, plain terms: the service is provided as-is and free; the user owns their content; acceptable use; no warranty (with a note on the irony); link to the open-source license; governing law (Malaysia, TBC); contact app@jaminly.app. Same Markdown and "Last updated" handling as the privacy policy.

### 5.4 Delete account (`/delete-account`)
Google Play requires a public web page explaining account deletion.
- Step-by-step in-app instructions (Settings → Delete account → type "delete" → enter the emailed code), matching App PRD AUTH-5.
- What is deleted (account, all warranties, all receipt files, push tokens) and when (immediately; deleted from backups within 14 days, when the backups rotate out).
- Fallback: email app@jaminly.app from the account's address, for users who no longer have the app.

### 5.5 404
Friendly message and link home in **both** languages side by side, same header and footer. A static host serves one `404.html` for every missing path, so the page can't pick a language from the URL without JavaScript. `noindex`, no canonical, left out of the sitemap.

### 5.6 Languages (i18n)

| ID | Requirement | Priority |
|---|---|---|
| I18N-1 | Two languages at launch: **English** (`en`, default, served at `/`) and **Bahasa Melayu** (`ms`, served at `/ms/`). Adding a language later means adding a locale folder, not changing code. | P0 |
| I18N-2 | Astro's built-in i18n routing: `defaultLocale: 'en'`, `locales: ['en', 'ms']`, `prefixDefaultLocale: false`. Every page is pre-rendered once per language; still fully static. | P0 |
| I18N-3 | UI strings (nav, buttons, section copy, FAQ, metadata) live in one dictionary per language (`src/i18n/en.ts`, `src/i18n/ms.ts`) with the same keys; a missing key fails the type check, never falls back silently. | P0 |
| I18N-4 | Long-form content (legal pages) lives in a content collection per language (`src/content/legal/{en,ms}/`). | P0 |
| I18N-5 | Language switcher in the header and footer links to the **same page** in the other language, labelled in its own language ("English", "Bahasa Melayu"). | P0 |
| I18N-6 | No automatic redirect by browser language or location. Static hosting can't do it cleanly, and redirects hide pages from search engines. The switcher is the only way to change language. | P0 |
| I18N-7 | `<html lang>` matches the page (`en` / `ms`); `hreflang` alternates for both languages plus `x-default` → English on every page; the sitemap lists the alternates. | P0 |
| I18N-8 | Titles, descriptions, OG images and JSON-LD text are translated too, not just the visible copy. | P0 |
| I18N-9 | Malay copy is written or reviewed by a native speaker, not machine-translated only. Malay keywords are researched separately ("jejak waranti", "simpan resit", "peringatan waranti tamat"), not translated one-for-one. | P0 |
| I18N-10 | Dates are formatted per language with `Intl.DateTimeFormat` ("27 October 2026" in `en-MY`, "27 Oktober 2026" in `ms-MY`). | P1 |

## 6. SEO Requirements

| ID | Requirement | Priority |
|---|---|---|
| SEO-1 | Unique `<title>` (≤ 60 chars) and meta description (≤ 155 chars) per page. | P0 |
| SEO-2 | Canonical URL on every page, from `site` in `astro.config.mjs`. | P0 |
| SEO-3 | Open Graph + Twitter card tags, with a 1200×630 OG image per page (a default one plus a variant for legal pages). | P0 |
| SEO-4 | JSON-LD: `SoftwareApplication` (name, OS: iOS/Android/Web, category: Utilities / Productivity, `offers.price: 0`) and `Organization` on Home; `FAQPage` for the FAQ; `WebPage` on legal pages. | P0 |
| SEO-5 | `@astrojs/sitemap` generates the sitemap; `robots.txt` allows all and points to it. | P0 |
| SEO-6 | Exactly one `<h1>` per page, logical heading order, descriptive link text, `alt` on every image. | P0 |
| SEO-7 | Per-language `lang`, `hreflang` and `x-default` as in I18N-7; canonical URL points at the page's own language. | P0 |
| SEO-8 | Smart App Banner meta (`apple-itunes-app`) once the App Store ID exists. | P2 |
| SEO-9 | Keyword targets live in the copy naturally: headline and first paragraph mention "warranty" and "receipt". No keyword stuffing, no hidden text. | P0 |
| SEO-10 | Submit the sitemap to Google Search Console and Bing Webmaster Tools after launch. | P1 |

## 7. Privacy Policy Content (source of truth)

The policy must match what the app does. This list comes from App PRD §6, §7 and §10 and must be re-checked whenever the data model changes.

| Topic | What the policy says |
|---|---|
| **Who we are** | Jaminly, an open-source project by Farid Aiman. Contact: app@jaminly.app. |
| **Scope** | Covers the official Jaminly apps and this website. Self-hosted instances are run by whoever hosts them; this policy doesn't apply to them. |
| **Account data** | From Google Sign-In: name, email address, profile photo URL. Google ID token is verified and discarded. |
| **Warranty data** | What the user enters: product name, brand, model, serial number, category, store, purchase date, price, warranty length, coverage notes, reminder settings. |
| **Receipts** | Photos and PDFs of proof of purchase. They can contain addresses and partial card numbers, so they are stored in private storage, encrypted at rest, and served only through short-lived signed links. |
| **Device data** | Expo push token (for reminders) and notification preferences. On the device, the session token sits in secure storage (native) or `localStorage` (web). |
| **Email** | Used for reminders the user turns on, and for the one-time account-deletion code. No marketing email. |
| **What we don't do** | No ads, no selling or sharing data for advertising, no tracking across apps or sites, no analytics unless it is opt-in (App PRD open question 6). |
| **Processors** | Google (sign-in), Expo (push delivery), the email provider (TBC), the hosting and storage provider (TBC). |
| **Retention & deletion** | Data kept while the account exists. In-app deletion removes the account, warranties, receipts and push tokens; removed from backups within 14 days. |
| **Your rights** | Access, correction, deletion, portability. PDPA 2010 (Malaysia) and GDPR where applicable. Requests go to app@jaminly.app. |
| **Children** | Not directed at children under 13 (or the local minimum age). |
| **Security** | HTTPS only, encryption at rest, private buckets, least-privilege access. |
| **Changes** | Material changes are announced in the app and on this page, with the "Last updated" date. |
| **Website** | This website is static: it has no backend, collects nothing through forms, sets no cookies and loads no third-party trackers. It is hosted on Vercel, which keeps standard request logs (IP, user agent) for a limited period for security and operations. Vercel Analytics and Speed Insights are not enabled. |

## 8. Non-functional Requirements

- **Performance:** static HTML, zero client JavaScript by default. LCP < 2.0 s on a mid-range phone over 4G, CLS < 0.05, total page weight on Home < 500 KB (excluding the lazy-loaded screenshots below the fold).
- **Images:** Astro `<Image>`/`<Picture>` with AVIF and WebP, explicit width/height, `loading="lazy"` below the fold, hero screenshot preloaded.
- **Fonts:** one self-hosted variable font (see DESIGN §3.2), `font-display: swap`, preloaded, subset to Latin (covers both English and Malay).
- **Accessibility:** WCAG 2.2 AA, keyboard navigable, visible focus ring, `prefers-reduced-motion` and `prefers-color-scheme` respected, works with JavaScript disabled.
- **Privacy:** no cookies, no third-party requests at runtime (fonts and images are self-hosted).
- **Browser support:** last 2 versions of evergreen browsers, iOS Safari 16+.

## 9. Technical Plan

| Area | Choice |
|---|---|
| Framework | Astro 7 (`output: 'static'`, no adapter, no server routes), already scaffolded in `apps/web` from the official `minimal` template |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite`, tokens as CSS variables (DESIGN §3) |
| Content | Astro content collections: `src/content/legal/{en,ms}/*.md` |
| i18n | Astro built-in i18n routing + typed string dictionaries in `src/i18n/` (§5.6). No i18n library needed. |
| Integrations | `@astrojs/sitemap` (with its `i18n` option for alternates), `@astrojs/mdx` (if FAQ or legal pages need components) |
| Icons | Phosphor via `astro-icon` + `@iconify-json/ph` (rendered to inline SVG at build time, no runtime JS) |
| Fonts | `@fontsource-variable/plus-jakarta-sans` |
| Screenshots | Captured from `warranty-ui` running on web with mock data by `pnpm --filter jaminly-web screens` (Playwright), saved to `src/assets/screens/` |
| Checks | `astro check` (types), `astro build`, Lighthouse CI on the built output |
| Hosting | Vercel, static output (no adapter needed). Not set up yet: local only for now (§9.1) |

Workspace scripts:
```bash
pnpm --filter jaminly-web dev       # http://localhost:4321
pnpm --filter jaminly-web build     # → apps/web/dist
pnpm --filter jaminly-web preview
```

### 9.1 Local first, Vercel later

For now the site is built and previewed locally only. Nothing is deployed and nothing points at `jaminly.app` yet.

- `site: 'https://jaminly.app'` is set in `astro.config.mjs` from the start, so canonical URLs, OG tags and the sitemap are already correct when it goes live.
- `warranty-ui/src/constants/links.ts` keeps its current value until the site is deployed; switching it earlier would link the app to a page that doesn't exist yet (§10).
- When it's time to deploy: import the repo in Vercel with **Root Directory** `apps/web`, framework preset **Astro**, build command `pnpm build`, output `dist`. Astro's static output needs no `@astrojs/vercel` adapter. Then add the `jaminly.app` domain (plus `www` redirecting to the apex) and turn on HTTPS.
- Don't enable Vercel Analytics or Speed Insights: the privacy policy promises no trackers (§7).

## 10. Changes Outside `apps/web`

- `warranty-ui/src/constants/links.ts` (at deploy time, not before): point `PRIVACY_URL` at `https://jaminly.app/privacy`, add `TERMS_URL` and `DELETE_ACCOUNT_URL`. It currently points at a `PRIVACY.md` on GitHub that doesn't exist.
- Root `README.md`: add `apps/web` to the monorepo layout and scripts.
- Store listings (M4 in App PRD): use the site's privacy and delete-account URLs.

## 11. Open Questions

Decided:
- 2026-09-29: domain `jaminly.app`, contact app@jaminly.app, hosting on Vercel, local-only until launch.
- 2026-09-29: the website is fully static with no backend; English and Bahasa Melayu at launch; deleted data is removed from backups within 14 days; lifestyle photos are supplied by the owner, placeholders until then (DESIGN §6).

Still open:
1. **App backend hosting.** Will Jaminly run an official hosted instance of `warranty-api` for app users, or is the app self-host only? (App PRD open question 5.) This decides whether the privacy policy covers a hosted service and whether the hero CTA says "Get the app" or "View on GitHub".
2. **Email provider** for reminders (App PRD open question 4), to name as a processor.
3. **More languages?** English and Malay are confirmed; anything else (e.g. Chinese, Tamil) later?
4. **Commitments in the W2 legal drafts** to confirm or change: reply to data requests within **21 days** (PDPA's limit for access requests), delete accounts requested by email within **7 days**, and give **30 days'** notice before shutting the service down. Governing law: Malaysia.

The legal pages still say "(Provider to be confirmed)" for the email provider and the hosting/storage provider. Replace those before launch (DESIGN §10).

## 12. Milestones

| Phase | Scope |
|---|---|
| **W0 — Scaffold** ✅ | Fresh Astro in `apps/web`, builds in the workspace. |
| **W1 — Foundation** ✅ | Tailwind v4, tokens, font, i18n routing and dictionaries, base layout, SEO component (with `hreflang`), header with language switcher, footer, 404. |
| **W2 — Legal** ✅ | Privacy, terms and delete-account pages with the content in §7, in English and Malay. (Can ship before the landing page: stores only need these URLs.) |
| **W3 — Landing page** ✅ | All Home sections in both languages, real app screenshots, photo placeholders, FAQ with JSON-LD. |
| **W4 — Polish & launch** | OG images, sitemap, robots, Lighthouse ≥ 95, taste-skill pre-flight check, deploy to Vercel on `jaminly.app` (§9.1), switch the app's `links.ts`, Search Console. |
| **v2** | Swap in supplied photos (can happen any time), more languages, blog/guides content collection ("How long is a phone warranty in Malaysia?"), app store badges and Smart App Banner. |
