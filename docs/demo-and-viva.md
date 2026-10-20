# Demonstration guide and viva preparation

## Demo script (≈10 minutes)

1. **Landing page** — explain purpose and "honest limits". Switch to Arabic to show RTL.
2. **Register / log in** — mention Supabase Auth and that passwords are never stored by HISN.
3. **Add a target** — try `http://169.254.169.254` and `http://localhost` first: both are rejected (SSRF protection). Then add a site you own, or `https://example.com` (public test domain).
4. **Start scan** — show the results page: severities, evidence, remediation, passed checks, filter by severity.
5. **PDF report** — download and walk through summary, findings and limitations.
6. **Second scan + compare** — on /scans pick A and B.
7. **Dashboard** — numbers come from the database.
8. **Security of HISN itself** — open browser dev-tools → Network → response headers of HISN.
9. **Tests** — run `npm test` and `su postgres -c "npm run test:rls"` live.
10. **PWA** — install from the browser, turn off Wi-Fi, show the offline page.

Prepare the demo with `LIVE_SCANNING_ENABLED=true` locally and a working internet connection.

## Likely viva questions

**What is SSRF and how does HISN prevent it?** Server-Side Request Forgery is making a server request URLs the attacker cannot reach directly (internal services, cloud metadata at 169.254.169.254). HISN rejects bad URLs, resolves the hostname and checks *every* IP against a block list, connects only to the checked IP, and repeats this on every redirect.

**What is DNS rebinding?** A domain that answers with a public IP during the check and a private IP when the connection is made. HISN's custom `lookup` function checks and returns the address used for the connection in one step, so there is no second DNS query.

**Why Row Level Security if the server already filters by user?** Defence in depth: if any query forgets the filter, PostgreSQL still returns only the user's rows. We tested this with two users (`tests/rls/rls.test.sql`).

**How are findings protected?** A finding has no user_id; the policy checks that its scan and that scan's target belong to the current user.

**Why is a missing CSP not "Critical"?** It is a hardening measure that reduces the impact of XSS; its absence alone is not an exploitable vulnerability.

**What happens when a site is down?** The scan is marked *failed* with the error message and no findings — a network error is never reported as a vulnerability.

**Why do you not store cookie values?** Data minimisation: values could be session tokens. Only names and missing attributes are needed as evidence.

**Why is `rejectUnauthorized: false` safe here?** We only read headers to report on them; accepting the connection lets us record "certificate not trusted" as a finding instead of failing.

**How do Server Actions work?** Form submissions call a function that runs only on the server. Next.js checks the request Origin (CSRF protection). We validate inputs with Zod inside each action.

**What does the service worker cache?** Only static public files and the offline page — never pages with user data or reports.

**Limitations?** Single URL, no authenticated areas, no injection testing, English PDF, default ports only, in-memory concurrency limit per server instance.
