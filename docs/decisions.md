# Decisions log

| # | Decision | Reason |
|---|----------|--------|
| D1 | Next.js 15 (App Router) with Server Actions, no separate backend | One codebase, simpler to explain; server actions keep secrets and scanning on the server. |
| D2 | Node `http`/`https` with a custom `lookup` instead of `fetch` | `fetch` cannot be pinned to a validated IP without an extra dependency; the custom lookup gives DNS-rebinding protection with built-in modules. |
| D3 | Manual redirect following | So every redirect hop is validated again. |
| D4 | Custom ports blocked | Keeps HISN from becoming a port scanner. Limitation: sites on non-standard ports cannot be scanned. |
| D5 | `rejectUnauthorized: false` in the scanner | Lets us *report* invalid certificates as findings instead of failing the scan. The connection is only read, never trusted for anything else. |
| D6 | Scans run synchronously inside the server action (≤30 s) | No job queue/Redis needed; acceptable for a few requests per scan. |
| D7 | All DB access uses the user's session (anon key + RLS); no service-role key | Removes the most dangerous secret; RLS is the real security boundary. |
| D8 | Missing headers rated Medium/Low/Info, never Critical | They are hardening gaps, not proven exploits. No current check produces Critical. |
| D9 | pdf-lib for PDF | Pure JavaScript, small, no headless browser. Its standard fonts are Latin-only, so reports are in English; non-Latin characters are replaced with `?`. |
| D10 | Findings are stored in English and translated to Arabic when displayed (`lib/finding-text.ts`); evidence stays raw English; PDF reports stay English | Keeps the scanner and database language-neutral; a unit test guarantees every possible finding has an Arabic text. |
| D11 | Live scanning off by default (`LIVE_SCANNING_ENABLED`) | Required by the project brief until protections are verified in the deployment environment. |
| D12 | Light i18n via a dictionary + cookie, not a routing library | A few dozen strings; a library would add configuration with little benefit. |
| D13 | RLS tested on plain PostgreSQL with a small `auth` shim | Supabase credentials/Docker are not available in the development container; the shim reproduces `auth.uid()` and roles. |
