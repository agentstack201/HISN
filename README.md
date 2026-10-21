# HISN (حِصن) — Web Application Security Assessment Platform

HISN is a Computing Diploma graduation project. Users register, add websites they own (or are authorized to test), and run a **basic, non-intrusive security assessment**. Every finding shows the evidence observed, a severity, and how to fix it. Results are saved, can be compared over time, and can be downloaded as a PDF report.

**Stack:** Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Row Level Security) · Zod · pdf-lib · Vitest · Playwright.

## What the scanner checks

| Area | Checks |
|------|--------|
| HTTPS / TLS | HTTPS used, HTTP→HTTPS redirect, certificate trusted, certificate expiry |
| Security headers | Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Cookies | Secure, HttpOnly, SameSite on observed cookies (cookie values are never stored) |
| Misconfigurations | Version disclosure, clickjacking protection, directory listing, permissive CORS with credentials |

It is **not** a penetration-testing tool: no attacks, no crawling, no port scanning. See [docs/security.md](docs/security.md).

## Quick start

Requirements: Node.js 20+ and a free Supabase project.

```bash
npm install
cp .env.example .env.local      # fill in your Supabase URL and anon key
```

1. In the Supabase dashboard → **SQL Editor**, run `supabase/migrations/20261020000000_initial_schema.sql` (or `supabase db push` with the Supabase CLI).
2. Supabase → Authentication → URL configuration: set the Site URL to your app URL (e.g. `http://localhost:3000`).
3. For a local demo, set `LIVE_SCANNING_ENABLED=true` in `.env.local` (see "Live scanning" below).
4. Run `npm run dev` and open http://localhost:3000.

Without Supabase variables the public pages work and protected pages show a setup notice.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit + scanner tests (Vitest) |
| `npm run test:rls` | Migration + RLS tests on a local PostgreSQL (`su postgres -c "npm run test:rls"`) |
| `npm run e2e` | Browser tests of public pages, headers and PWA (needs `npm run build` first) |
| `npm run e2e:auth` | Full logged-in workflow against your Supabase project (needs `.env.local` and the two test users from `tests/supabase/create-test-users.sql`; delete them afterwards) |

## Live scanning

Scanning is **off by default**. It only runs when `LIVE_SCANNING_ENABLED=true`. Turn it on only in an environment where you have verified the protections in [docs/security.md](docs/security.md) (SSRF blocking, rate limits, timeouts). Each scan runs on the server and needs internet access.

## Deployment

The app is a standard Next.js app and can be deployed to any Node.js host (e.g. Vercel). Set the three environment variables from `.env.example` in the host's settings. No service-role key is needed. Deployment has **not** been performed yet — see [docs/project-status.md](docs/project-status.md).

## Project structure

```
app/                 pages, layout, server actions (actions.ts), PDF route
components/          shared UI (badges, forms, auth form, service-worker registration)
lib/targets.ts       URL validation + SSRF-safe HTTP requests
lib/security-checks.ts  the individual checks (pure functions)
lib/scanner.ts       runs a scan and collects findings
lib/reports.ts       loads a scan and builds the PDF
lib/validation.ts    Zod schemas for all forms
lib/i18n.ts          English / Arabic text
lib/supabase/        Supabase server client + auth helper
middleware.ts        refreshes the login session cookie
supabase/migrations/ database schema + RLS policies
public/              manifest, service worker, offline page, icons
tests/  e2e/         automated tests
docs/                documentation
```

## Documentation

- [Requirements & checklist](docs/requirements.md) · [Architecture](docs/architecture.md) · [Security](docs/security.md) · [Threat model](docs/threat-model.md)
- [Test plan & results](docs/test-plan.md) · [Project status](docs/project-status.md) · [Decisions](docs/decisions.md)
- [Demonstration guide & viva preparation](docs/demo-and-viva.md)

## Responsible use

Only scan websites you own or have written permission to test. HISN finding no issues does **not** mean a website is completely secure.
