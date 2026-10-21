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
| Homepage video: muted, loop, playsInline, actually playing (WebM), pause button, reduced-motion no-autoplay | `npm run e2e` | PASS |
| Homepage links/anchors all resolve; Arabic RTL default | `npm run e2e` | PASS |
| Homepage visual check at 1440/1280/768/390 px | Playwright screenshots, reviewed | PASS |
| Login, wrong-password message, unsafe URLs rejected in the form, target add/delete | `npm run e2e:auth` against the real Supabase project | PASS |
| Real scan of example.com saved in Supabase, evidence + severity filter, scan comparison, dashboard | `npm run e2e:auth` | PASS |
| PDF download route (valid %PDF, no-store; 401 when logged out) | `npm run e2e:auth` | PASS |
| User B cannot open A's target, scan or report (404) and sees empty lists | `npm run e2e:auth` | PASS |
| Rate limit: scan refused after the limit | `npm run e2e:auth` | PASS |
| Deleting a target removes its scans; settings saved | `npm run e2e:auth` | PASS |
| Live database: RLS enabled on all 4 tables, 9 policies, anonymous reads return nothing | SQL + REST check | PASS |
| Self-registration through the form with email confirmation | not tested: confirmation emails cannot be read in the test environment; test users were created directly in the database (`tests/supabase/create-test-users.sql`) and removed afterwards | BLOCKED |
| Deployed site (Vercel): login, target add, metadata IP rejected, real scan with real TLS issuer, DNS-to-127.0.0.1 domain blocked | Playwright script against https://hisn-delta.vercel.app | PASS |
| PWA install prompt on a real phone | needs deployment over HTTPS | BLOCKED |
| Accessibility | partial: semantic HTML, labels, skip link, focus styles, role=alert/status; no automated audit yet | PARTIAL |

Totals: Vitest 56/56; Playwright public 23 passed; Playwright authenticated 10/10; local RLS 10/10.

## Manual test checklist once Supabase is connected

1. Register two users A and B. 2. A adds a target and scans it. 3. B opens A's `/targets/<id>` and `/scans/<id>` and `/scans/<id>/report` → 404. 4. A runs 6 scans in 10 minutes → 6th refused. 5. Add `http://169.254.169.254` → rejected. 6. Scan an unreachable domain → scan "failed", no findings. 7. Download PDF for completed and failed scans. 8. Delete target → its scans disappear.
