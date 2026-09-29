# Jaminly Website — Launch Checklist

Status: ready to launch once the blockers below are cleared · Last updated 2026-09-29 · Related: [PRD](./PRD.md) §9.1 and §12, [DESIGN](./DESIGN.md) §10

The site is built and checked locally (W0–W4). Nothing is deployed yet. This page lists what's left and the exact order to go live.

## Where things stand

| Check | Result |
|---|---|
| `pnpm --filter jaminly-web check` | 0 errors |
| `pnpm --filter jaminly-web build` | 9 pages + 8 sharing images, no warnings except missing photos |
| `pnpm --filter jaminly-web preflight` | 0 errors, launch blockers listed below |
| Lighthouse (local, mobile emulation) | `/` 98 · 100 · 100 · 100, `/ms` 100 · 100 · 100 · 100, `/privacy` and `/ms/privacy` 100 · 100 · 100 · 100 (Performance · Accessibility · Best Practices · SEO). LCP 1.2 s, CLS 0 |
| Initial page weight | about 170 KB desktop, 190 KB mobile (budget 500 KB) |

## 1. Before launch (blockers)

`pnpm preflight` fails until the first two are done.

- [ ] **Photos:** add `problem.jpg` and `closing.jpg` to `src/assets/photos/` (sizes in that folder's README). `og.jpg` is optional: without it, sharing images show the app screenshot.
- [ ] **Providers:** replace "(Provider to be confirmed)" / "(Penyedia akan disahkan.)" in `src/content/legal/{en,ms}/privacy.md` with the email provider and the hosting/storage provider. Update the `updated:` date and the version history.
- [ ] **Legal review:** privacy policy, terms and delete-account page reviewed by someone with legal knowledge (PRD LEGAL-5). Confirm the commitments: 21 days for data requests, 7 days for email deletion requests, 30 days' shutdown notice, Malaysian law.
- [ ] **Malay review:** a native speaker checks `src/i18n/ms.ts` and `src/content/legal/ms/` (PRD I18N-9).
- [ ] **By eye:** open `/` and `/ms` in light and dark mode on a phone and a laptop (DESIGN §10 items a script can't judge).

## 2. Deploy to Vercel

1. In Vercel, **Add New → Project**, import `ifaridaiman/jaminly`.
2. **Root Directory:** `apps/web`. Framework preset: Astro (picked up from `vercel.json`). Leave install/build commands as they are; `vercel.json` sets `pnpm build` and `dist`.
3. Don't add any environment variables. The site needs none.
4. Don't enable **Web Analytics** or **Speed Insights**: the privacy policy says the site loads no trackers.
5. Deploy, then open the preview URL and run through `/`, `/ms`, `/privacy`, `/delete-account` and a missing page (bilingual 404).
6. **Domains:** add `jaminly.app` and `www.jaminly.app`, with `www` redirecting to the apex. HTTPS is automatic.

`vercel.json` already sets: no trailing slashes (`/ms/` → `/ms`), long-lived caching for `/_astro/*`, and basic security headers (`nosniff`, no framing, strict referrer, camera/mic/location off).

## 3. After it's live

- [ ] **App links:** in `apps/warranty-ui/src/constants/links.ts`, set `PRIVACY_URL` to `https://jaminly.app/privacy` and add `TERMS_URL` / `DELETE_ACCOUNT_URL` (PRD §10). Ship it with the next app build.
- [ ] **Store listings:** use `https://jaminly.app/privacy` as the privacy policy URL (App Store and Google Play) and `https://jaminly.app/delete-account` as the account deletion URL (Google Play).
- [ ] **Search:** add `jaminly.app` to Google Search Console and Bing Webmaster Tools and submit `https://jaminly.app/sitemap-index.xml` (SEO-10).
- [ ] **Sharing preview:** paste the home page URL into the LinkedIn Post Inspector or a WhatsApp chat and check the card shows the image and title.
- [ ] **Store buttons:** when the listings exist, fill in `appLinks` in `src/lib/site.ts`. The closing section then shows App Store / Google Play buttons instead of "follow on GitHub" (PRD §5.1).

## Keeping it up to date

- **App UI changed?** Run `pnpm --filter jaminly-web screens` to re-capture every screenshot, then rebuild.
- **Legal text changed?** Update both languages, the `updated:` date and the version history in the same pull request.
- **Before every release:** `pnpm --filter jaminly-web build && pnpm --filter jaminly-web preflight`.
