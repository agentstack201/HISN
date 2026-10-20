# Test plan and results

Last run: 2026-10-20, in the development container (Node 22, PostgreSQL 16, Chromium 1194).

| Area | How tested | Result |
|------|-----------|--------|
| TypeScript compilation | `npm run typecheck` | PASS |
| Linting | `npm run lint` | PASS (0 problems) |
| Production build | `npm run build` | PASS |
| Input validation (URL rules, Zod) | `tests/targets.test.ts` | PASS |
| SSRF: private/reserved IPs, IPv6, mapped IPv4, metadata, localhost, ports, credentials | `tests/targets.test.ts` (33 tests) | PASS |
| Redirect re-validation (redirect to 169.254.169.254) | `tests/scanner.test.ts` | PASS |
| DNS check / rebinding (hostname with one private address) | `tests/scanner.test.ts` | PASS |
| Timeout, redirect loop, response size limit | `tests/scanner.test.ts` | PASS |
| Finding generation (each check: pass / fail / weak / info / inconclusive) | `tests/security-checks.test.ts` (12 tests) | PASS |
| Network failure ≠ vulnerability | `tests/scanner.test.ts` | PASS |
| Live scan of a real public site | manual: `runScan("https://example.com")` | PASS — 11 results, findings matched the site's actual headers |
| PDF generation (multi-page, failed scan, empty, Arabic name) | `tests/reports.test.ts` | PASS |
| RLS: own access, cross-user read/update/delete, foreign inserts, re-pointing scans, completed-scan immutability, anon access, constraints | `npm run test:rls` (10 checks) on local PostgreSQL with auth shim | PASS |
| Public pages, RTL switch, no horizontal scroll (1280 px and 375 px) | `npm run e2e` | PASS |
| HISN security headers, manifest, icons, SW no-cache | `npm run e2e` | PASS |
| Service worker registration + offline page | `npm run e2e` (desktop Chromium) | PASS |
| Registration, login, logout, session handling | needs Supabase project | BLOCKED |
| Target CRUD, scan persistence, dashboard, history, compare, PDF download route | needs Supabase project | BLOCKED |
| Rate limit (6th scan refused) | needs Supabase project | BLOCKED |
| PWA install prompt on a real phone | needs deployment over HTTPS | BLOCKED |
| Accessibility | partial: semantic HTML, labels, skip link, focus styles, role=alert/status; no automated audit yet | PARTIAL |

Totals: Vitest 54/54 passed; Playwright 9 passed, 1 skipped (offline test runs on desktop only); RLS 10/10 passed.

## Manual test checklist once Supabase is connected

1. Register two users A and B. 2. A adds a target and scans it. 3. B opens A's `/targets/<id>` and `/scans/<id>` and `/scans/<id>/report` → 404. 4. A runs 6 scans in 10 minutes → 6th refused. 5. Add `http://169.254.169.254` → rejected. 6. Scan an unreachable domain → scan "failed", no findings. 7. Download PDF for completed and failed scans. 8. Delete target → its scans disappear.
