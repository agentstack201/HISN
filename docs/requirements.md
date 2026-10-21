# Requirements and implementation checklist

Status: ✅ done & verified · 🟡 done, not verified end-to-end (needs Supabase) · ⬜ not done

## Functional

| ID | Requirement | Status |
|----|-------------|--------|
| F1 | Landing, overview, help/contact, responsive nav & footer | ✅ |
| F2 | English LTR / Arabic RTL interface | ✅ (findings translated at display time; PDF English, see D10) |
| F3 | Register, login, logout, session refresh | 🟡 |
| F4 | Account settings (display name, language) | 🟡 |
| F5 | Add / list / edit / delete targets with URL validation & ownership | 🟡 (validation ✅) |
| F6 | Authorization confirmation before saving a target | ✅ |
| F7 | Scanner: HTTPS/TLS, headers, cookies, misconfigurations | ✅ (tested on example.com and a local controlled server) |
| F8 | Findings with severity, evidence, remediation, confidence, status | ✅ |
| F9 | Failed / inconclusive handling (no fake vulnerabilities) | ✅ |
| F10 | Persist scans and findings | 🟡 (RLS/schema ✅ on PostgreSQL) |
| F11 | Dashboard from database data | 🟡 |
| F12 | Scan history, details, severity filter, compare two scans | 🟡 |
| F13 | PDF report (summary, grouped findings, evidence, limitations, failed scans) | ✅ (generation tested) 🟡 (download route) |
| F14 | PWA: manifest, icons, service worker, offline page, update prompt | ✅ |

## Security / non-functional

| ID | Requirement | Status |
|----|-------------|--------|
| S1 | SSRF protection (private IPs, metadata, localhost, DNS, rebinding, redirects) | ✅ |
| S2 | Timeouts, response size limit, redirect limit | ✅ |
| S3 | Rate and concurrency limits | 🟡 |
| S4 | RLS on all tables, cross-user isolation | ✅ (local PostgreSQL) |
| S5 | Server-side Zod validation | ✅ |
| S6 | No secrets in repo / browser | ✅ |
| S7 | Security headers on HISN itself | ✅ |
| S8 | Live scanning disabled by default | ✅ |
| N1 | TypeScript, lint, production build clean | ✅ |
| N2 | Code understandable for diploma students | ongoing |

## Remaining tasks (priority order)

1. Connect a real Supabase project and run the full workflow (F3–F5, F10–F13). **Needs owner action.**
2. Add authenticated Playwright tests once Supabase test credentials exist.
3. Deploy to a host after approval and repeat the checks in security.md §7.
4. Optional: nonce-based CSP; Arabic-capable PDF font.
