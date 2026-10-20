# Project status

_Updated: 2026-10-20 (homepage milestone)_

## Latest milestone: cinematic homepage

- New Arabic-first (RTL) homepage in `app/page.tsx`: fortress video hero, capability strip (real features only, no statistics), dashboard preview clearly labelled as demonstration data, four-step "how it works", about section, final CTA, and a new footer.
- New site header (`components/SiteHeader.tsx`) with the HISN logo, anchors to real sections, login, and an "ابدأ الآن" button linking to /register. The mobile menu uses `<details>`, so it needs no JavaScript.
- `components/HeroVideo.tsx`: muted, looping, playsInline video with a poster image. It does not autoplay under reduced motion and has a pause/play button.
- Assets: `public/videos/hisn-fortress.webm` (VP9, 1.3 MB) and `.mp4` (H.264, 2.4 MB). Both were made from the supplied MP4 with the audio track removed. Also `public/images/hisn-fortress-poster.jpg`, `hisn-logo.jpg` and `hisn-mark.jpg`, cropped from the supplied logo.
- Arabic is now the default language; English is chosen via the EN switch.
- Inner pages moved into the `app/(app)/` route group (URLs unchanged) so the homepage can be full-bleed.
- Tests: lint PASS, typecheck PASS, Vitest 54/54 PASS, build PASS, Playwright 19 passed / 5 skipped. The browser tests cover the video playing silently and looping, reduced motion, every homepage link resolving, RTL default, the language switch, and no horizontal scroll at 1280 px and 375 px.
- Visual inspection: done with Chromium screenshots at 1440, 1280, 768 and 390 px.
- Known gap: the Help page body is still English (shown left-to-right).
- Brand note: the logo includes a palm-and-swords emblem resembling the Saudi national emblem. Confirm it may be used before any public launch.


**Estimated overall completion:** about 75% (an estimate, not a measurement). The remaining work is mainly verifying the full workflow against a real Supabase project and deploying.

**Current phase:** Phase 9 (quality assurance). Phases 1–8 are implemented. Phase 10 handover docs are drafted.

## Completed

- Next.js 15 + TypeScript + Tailwind 4 foundation, ESLint, Vitest, Playwright.
- Design system (navy/teal), responsive layout, English/Arabic with RTL.
- Landing, help, login/register, dashboard, targets, target detail, scan history + compare, scan details + severity filter, settings, setup notice.
- Supabase migration: 4 tables, constraints, indexes, profile trigger, RLS policies.
- Scanner: SSRF-safe requests (DNS-pinned, redirect re-validation, timeouts, size limits) and 4 check groups (13 check keys).
- Server actions with Zod validation, ownership checks, rate and concurrency limits, live-scanning switch.
- PDF reports built from saved data.
- PWA: manifest, icons, service worker (static-only caching), offline page, update prompt.
- Documentation set listed in README.

## Tests (actual results)

See [test-plan.md](test-plan.md). Vitest 54/54 PASS, RLS 10/10 PASS, Playwright 9 PASS / 1 skipped, typecheck/lint/build PASS. Authenticated workflows: **BLOCKED** (no Supabase project).

## Known defects / limitations

- Only default ports can be scanned (by design).
- PDF reports are English-only; Arabic characters become `?`.
- The concurrency limit is per server instance.
- CSP allows inline scripts (Next.js requirement).

## Blockers needing your action

1. **Create a Supabase project** (free tier), run the migration, and put the URL and anon key in `.env.local`. Then I can verify registration, target management, scan persistence, dashboard and reports end to end.
2. **Approve a hosting provider** (e.g. Vercel free tier) before any public deployment.

## Next step

Once Supabase credentials are available: run the manual checklist in test-plan.md, add authenticated Playwright tests, and fix anything found.
