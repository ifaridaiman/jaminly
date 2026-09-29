# jaminly-web

The Jaminly website: landing page and legal pages (privacy, terms, account deletion), in English and Bahasa Melayu. Static Astro site, no backend.

- Plan: [`docs/PRD.md`](docs/PRD.md)
- Design: [`docs/DESIGN.md`](docs/DESIGN.md) (follows the `design-taste-frontend` skill in `.claude/skills/`)
- Going live: [`docs/LAUNCH.md`](docs/LAUNCH.md)

## Commands

Run from the repo root:

```bash
pnpm --filter jaminly-web dev       # http://localhost:4321
pnpm --filter jaminly-web check     # type-check .astro and .ts files
pnpm --filter jaminly-web build     # static output in apps/web/dist
pnpm --filter jaminly-web preview   # serve the built site
pnpm --filter jaminly-web screens   # re-capture app screenshots from warranty-ui (Playwright)
pnpm --filter jaminly-web preflight # pre-launch checks on dist/ (run after build)
```

## Layout

```
src/
  styles/global.css     design tokens (colours, type, radii) + Tailwind v4
  i18n/                 locale config, en.ts / ms.ts dictionaries, URL helpers
  layouts/BaseLayout    <html>, <head>, header, footer
  components/           Seo, Header, Footer, Button, LanguageSwitcher, Screenshot, PhotoSlot
  components/home/      the eight Home sections
  content/legal/        privacy, terms, delete-account in en/ and ms/
  assets/screens/       app screenshots (light + dark), made by `pnpm screens`
  views/                page bodies shared by every language
  pages/                routes: `/` (English) and `/ms/` (Malay) render the same view
  assets/photos/        drop owner-supplied photos here (see its README)
```

## Adding text

Add the string to `src/i18n/en.ts` and the same key to `src/i18n/ms.ts`. A key missing from either language fails `pnpm check`.

## Adding a page

1. Put the page body in `src/views/`.
2. Add a thin route in `src/pages/` and `src/pages/ms/` that renders it.
3. Pass the locale-neutral `path` (e.g. `/privacy`) to `BaseLayout` so canonical and `hreflang` links are correct.
