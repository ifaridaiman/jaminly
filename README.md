# jaminly

Jaminly is a free, open-source personal warranty vault. Register the products
you buy, attach proof of purchase, and get reminded before the warranty
expires — so you can actually claim while you still can.

## The problem

- Receipts fade, get lost, or sit buried in email.
- Warranty periods get forgotten, and you only find out the product is out of
  warranty after it breaks.
- Even with a receipt in hand, most people don't know *what* is covered
  (parts vs. labour, accidental damage, battery, etc.), so they don't claim
  what they're entitled to.

## What it does

- Add a warranty with purchase date, warranty length, and a required proof
  of purchase (photo or PDF).
- Get push/email reminders before a warranty expires.
- See what each warranty covers and excludes at a glance.
- One account, same data on web and mobile.
- Open source and self-hostable.

See [`apps/warranty-ui/docs/PRD.md`](apps/warranty-ui/docs/PRD.md) for the
full product spec.

## Monorepo layout

This is a pnpm workspace with three apps:

```
apps/
  warranty-ui/   Expo (React Native) app — iOS, Android, Web
  warranty-api/  NestJS backend API
  web/           Astro marketing site + privacy policy (see apps/web/docs)
```

## Getting started

Requires [pnpm](https://pnpm.io) (`pnpm@9`).

```bash
pnpm install
```

Run the mobile/web app:

```bash
pnpm --filter warranty-ui start
```

Run the API:

```bash
pnpm --filter warranty-api start:dev
```

Run the website:

```bash
pnpm --filter jaminly-web dev
```

## Tech stack

- **warranty-ui** — Expo SDK 57, Expo Router, React Native, React Query
- **warranty-api** — NestJS
- **web** — Astro 7 (static)

## License

Open source (MIT, TBC).
