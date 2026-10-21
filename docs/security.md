# Security design

## 1. Scanner network safety (SSRF protection) — `lib/targets.ts`

The scanner makes requests from our server, so it must not be usable to reach internal systems.

| Control | How |
|---------|-----|
| Scheme | only `http:` / `https:` |
| Port | default ports only (no port scanning) |
| Credentials in URL | rejected |
| Internal names | `localhost`, `*.localhost`, `*.local`, `*.internal`, single-label names rejected |
| Literal IPs | must be public (`isPublicIp`) |
| DNS | every resolved address must be public; one private address rejects the request |
| DNS rebinding | the custom `lookup` function validates and then connects to **that same IP**, so DNS cannot change between check and connect |
| Redirects | followed manually, max 5, each hop re-validated (URL + DNS) |
| Timeouts | 8 s per request, 30 s per scan |
| Response size | first 256 KB only |
| Data minimisation | cookie values are never stored, only names; bodies are not stored |

Blocked ranges include 0/8, 10/8, 100.64/10, 127/8, 169.254/16 (cloud metadata), 172.16/12, 192.168/16, documentation/benchmark ranges, multicast/reserved, and IPv6 `::1`, `fc00::/7`, `fe80::/10`, NAT64 and IPv4-mapped addresses.

## 2. Abuse limits — `app/actions.ts` `startScan`

- Scanning disabled unless `LIVE_SCANNING_ENABLED=true`.
- Logged-in users only; target loaded with an ownership filter.
- 5 scans per user per 10 minutes; one running scan per target; at most 3 concurrent scans per server process.
- Users must tick "I own this website or have written permission to test it".

## 3. Authentication & authorization

- Supabase Auth handles passwords (hashed by Supabase; HISN never sees stored passwords).
- `requireUser()` uses `supabase.auth.getUser()`, which verifies the token with Supabase rather than trusting the cookie.
- Login errors use one generic message to avoid revealing which emails exist.
- **Two layers**: server code filters by `user_id`, and **RLS** in PostgreSQL enforces the same rule even if a query forgets it.
- Findings are visible only if the parent scan **and** its target belong to the user; findings can only be added to the user's own *running* scan.
- No service-role key is used anywhere; the browser only holds the public anon key.

## 4. Input validation — `lib/validation.ts`

All form input is parsed with Zod on the server (lengths, email format, UUIDs, URL safety, language enum). Database CHECK constraints repeat the critical rules (severity values, status values, URL scheme).

## 5. HISN's own web security — `next.config.ts`

HISN sends the headers it recommends: CSP (`frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options; the `X-Powered-By` header is removed. Next.js Server Actions include built-in CSRF protection (Origin check). React escapes output, preventing XSS from stored scan evidence.

The CSP allows `'unsafe-inline'` scripts because Next.js uses inline hydration scripts; a nonce-based CSP is a possible future improvement.

## 6. PWA caching — `public/sw.js`

Only public static files are cached (build assets, icons, offline page). Pages, reports and data always go to the network and are never cached. The PDF route sends `Cache-Control: private, no-store`.

## 7. Before enabling public live scanning

Verify in the target hosting environment:
1. Outbound requests from the host to private ranges are blocked by HISN (run `npm test`, then try adding `http://169.254.169.254` — it must be rejected).
2. The host does not route requests through a proxy that bypasses the IP check (proxies resolve DNS themselves).
3. Rate limits work (6th scan within 10 minutes is refused).
4. Server function timeouts are ≥ 30 s.

Note: the per-process concurrency counter does not cover multiple server instances; the database rate limit does.
