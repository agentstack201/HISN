# Threat model

**Assets:** user accounts, saved targets, scan results (which reveal weaknesses of users' sites), the HISN server and its network position.

**Actors:** anonymous visitor, registered user (possibly malicious), external attacker, a malicious target website.

| # | Threat (STRIDE) | Example | Mitigation | Status |
|---|-----------------|---------|-----------|--------|
| T1 | SSRF (Elevation) | User adds `http://169.254.169.254/` or a domain resolving to 10.0.0.5 | URL rules, DNS check of all addresses, IP-pinned connection, redirect re-validation | Implemented, unit-tested |
| T2 | DNS rebinding | Domain returns public IP on check, private IP on connect | Check and connect use the same lookup result | Implemented, tested |
| T3 | Scanner abuse / DoS of third parties | Many scans against someone else's site | Login required, authorization checkbox, 5 scans/10 min, 1 running per target, timeouts, no port scan | Implemented |
| T4 | Malicious target (DoS of HISN) | Huge or never-ending response, redirect loops | 256 KB limit, 8 s / 30 s timeouts, max 5 redirects | Implemented, tested |
| T5 | Cross-user data access (Information disclosure) | User changes a target/scan ID in the URL | Ownership filters + RLS on all tables | Implemented, RLS-tested |
| T6 | Tampering with results | User inserts fake findings into another user's scan | RLS insert policy via scan + target ownership | Tested |
| T7 | Self-tampering | User inserts fake findings into **their own** running scan via the API | Only affects their own data; documented limitation | Accepted |
| T8 | Spoofing | Stolen/forged session cookie | Supabase-signed tokens verified with `getUser()`; HttpOnly cookies set by @supabase/ssr | Implemented |
| T9 | Stored XSS | Target returns `<script>` in a header shown as evidence | React escaping; CSP | Implemented |
| T10 | CSRF | Another site submits a form to HISN | Server Actions Origin check; SameSite cookies | Framework-provided |
| T11 | Account enumeration | Different error for unknown email | Generic login error | Implemented |
| T12 | Sensitive data in cache | Shared device keeps scan results | SW caches static files only; reports `no-store` | Implemented, e2e-tested |
| T13 | Secret leakage | Service-role key in browser bundle | No service-role key used; `.env*` git-ignored | Implemented |
| T14 | Misleading results (Repudiation of accuracy) | Network error shown as vulnerability | Failed scans have no findings; inconclusive status; limitations in UI and PDF | Implemented, tested |

**Residual risks:** CSP allows inline scripts (Next.js requirement); in-memory concurrency limit is per instance; Supabase email confirmation and password policy are configured in the Supabase dashboard.
