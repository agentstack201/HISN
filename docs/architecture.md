# Architecture

HISN is one Next.js application. Pages and server-side logic live together; Supabase provides the database and login. There is no separate backend server.

```
 Browser ──HTTPS──▶ Next.js server ──────────▶ Supabase (Auth + PostgreSQL with RLS)
   │                  │  pages (Server Components)
   │                  │  app/actions.ts (Server Actions)
   │                  │  lib/scanner.ts ──safe HTTP──▶ Target website (public internet only)
   └─ service worker (static files + offline page only)
```

## Request flow: running a scan

```
User clicks "Start scan"
  → startScan (app/actions.ts)
      1. LIVE_SCANNING_ENABLED must be "true"
      2. requireUser()            — verified login
      3. load target WHERE id = ? AND user_id = me   (ownership check)
      4. rate limit: ≤5 scans / 10 min, 1 running per target, ≤3 per server
      5. insert scan (status = running)
      6. runScan(url)  (lib/scanner.ts)
           safeFetch(url) and safeFetch(http:// version)   (lib/targets.ts)
           checkHttps / checkHeaders / checkCookies / checkMisconfigurations
      7. insert findings, update scan → completed or failed
  → redirect to /scans/:id
```

## Database

```
auth.users (Supabase) 1──1 profiles
auth.users 1──* targets 1──* scans 1──* findings
```

| Table | Purpose | Key columns |
|-------|---------|-------------|
| profiles | display name, language | id → auth.users |
| targets | saved websites | user_id, name, url (unique per user) |
| scans | one assessment run | user_id, target_id, status (running/completed/failed), started_at, completed_at, error_message |
| findings | one result of one check | scan_id, check_key, title, severity, description, evidence, remediation, confidence, status (passed/failed/info/inconclusive) |

Deleting a target cascades to its scans and findings. A trigger creates a profile on sign-up. See `supabase/migrations/` for constraints, indexes and RLS policies.

## Modules

| Module | Receives | Returns | Used by |
|--------|----------|---------|---------|
| `lib/targets.ts` `checkTargetUrl` | URL string | cleaned URL or error | validation, safeFetch |
| `lib/targets.ts` `isPublicIp` | IP string | true if public | safeFetch DNS check |
| `lib/targets.ts` `safeFetch` | URL | list of responses (redirect hops) | scanner |
| `lib/security-checks.ts` `check*` | responses | Finding[] | scanner |
| `lib/scanner.ts` `runScan` | URL | `{status, findings, error}` (never throws) | startScan |
| `lib/reports.ts` `loadScan` | Supabase client, scan id | scan + target + findings or null | scan page, report route |
| `lib/reports.ts` `buildReport` | loaded scan | PDF bytes | report route |
| `lib/validation.ts` | form data | parsed data / errors | all server actions |
| `lib/supabase/server.ts` `requireUser` | – | client + verified user, or redirect | protected pages/actions |
| `app/actions.ts` | form posts | FormState / redirect | all forms |

## Pages

`/` landing · `/login` `/register` · `/dashboard` · `/targets` · `/targets/[id]` (edit, delete, scan, history) · `/scans` (history + compare) · `/scans/[id]` (details, severity filter) · `/scans/[id]/report` (PDF) · `/settings` · `/help` · `/setup`.

## Localization

`lib/i18n.ts` holds English and Arabic text. The `lang` cookie selects the language and `<html dir="rtl">` is set for Arabic. Tailwind logical properties (`ps-`, `text-end`) keep layouts correct in both directions.
