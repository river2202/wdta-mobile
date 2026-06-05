# Progress Log

## Session: 2026-05-30

### Phase 1: Requirements and Discovery

- **Status:** complete
- **Started:** 2026-05-30 16:39:50 AEST
- Actions taken:
  - Read the `planning-with-files-zh` skill instructions.
  - Checked the repository and confirmed it only contained Git metadata before this task.
  - Reused prior source-page discovery for `daytime=AA` and `section=AA017`.
  - Confirmed `AA016` returns Girls S/D Rubbers Section 1.
  - Checked official Vercel Cron documentation for daily schedule behavior and UTC timing.
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
  - `README.md`

### Phase 2: Documentation Baseline

- **Status:** complete
- Actions taken:
  - Wrote README documenting source endpoints, cache scope, Vercel/GitHub/Next.js architecture, daily refresh plan, data shape, mobile UI direction, and implementation phases.
  - Recorded research findings and technical decisions.
  - Created a persistent task plan for the future implementation.
- Files created/modified:
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 3: Documentation Verification and Handoff

- **Status:** complete
- Actions taken:
  - Reviewed README and task plan contents.
  - Checked git status and confirmed the documentation files were untracked.
- Files created/modified:
  - `task_plan.md`
  - `progress.md`

### Phase 4: Next.js Scaffold

- **Status:** complete
- **Started:** 2026-05-30 16:39:50 AEST
- Actions taken:
  - Resumed after planning hook requested continuation.
  - Re-read `task_plan.md`, `findings.md`, and `progress.md`.
  - Confirmed Node and npm are available locally.
  - Checked current npm versions for `next`, `react`, and `cheerio`.
  - Added Next.js app configuration, TypeScript configuration, ESLint configuration, and npm scripts.
  - Added the initial App Router page and global CSS.
  - Installed npm dependencies.
  - Adjusted Bye cards to show only the team with the bye plus a status badge.
  - Added source-only TypeScript config for `npm run typecheck`; Next generated route validation is covered by `npm run build`.
  - Ran `npm run typecheck`, `npm run lint`, and `npm run build` successfully after fixes.
- Files created/modified:
  - `package.json`
  - `package-lock.json`
  - `.gitignore`
  - `next-env.d.ts`
  - `next.config.ts`
  - `tsconfig.json`
  - `tsconfig.typecheck.json`
  - `eslint.config.mjs`
  - `app/layout.tsx`
  - `app/page.tsx`
  - `app/globals.css`
  - `public/tennis-mark.svg`

### Phase 5: Data Fetch and Cache Pipeline

- **Status:** complete
- **Started:** 2026-05-30 16:39:50 AEST
- Actions taken:
  - Added WDTA TypeScript types.
  - Added source fetcher for the Saturday AM `AA` competition.
  - Added Cheerio parser for section option discovery, result loaded timestamp, round headers, played matches, byes, wash outs, and forfeits.
  - Added refresh script to write `data/wdta-results.json`.
  - Ran `npm run refresh:data`; it wrote 2 sections and 4 rounds per section.
  - Added GitHub Actions workflow for daily refresh at `0 20 * * *` UTC and manual dispatch.
  - Added PostCSS override and verified `npm install` reports 0 vulnerabilities.
- Files created/modified:
  - `lib/wdta/types.ts`
  - `lib/wdta/parse.ts`
  - `lib/wdta/fetch.ts`
  - `scripts/refresh-wdta-results.ts`
  - `data/wdta-results.json`
  - `.github/workflows/refresh-results.yml`
  - `package.json`
  - `package-lock.json`

### Phase 6: Mobile UI and Deployment Prep

- **Status:** complete
- **Started:** 2026-05-30 16:39:50 AEST
- Actions taken:
  - Built mobile-friendly result cards grouped by round.
  - Added Section 1 / Section 2 segmented navigation via query string.
  - Started production server with `npm run start -- --hostname 127.0.0.1 --port 3000`.
  - Installed Playwright Chromium browser binary for local verification.
  - Captured mobile and desktop screenshots to `artifacts/`.
  - Verified 390px and 1024px layouts have no horizontal overflow.
  - Verified Section 2 route renders with active Section 2 tab, 16 cards, and no overflow.
  - Updated README with implemented status, local commands, refresh behavior, and deployment handoff steps.
- Files created/modified:
  - `README.md`
  - `.gitignore`
  - `app/page.tsx`
  - `app/globals.css`
  - `artifacts/mobile.png`
  - `artifacts/desktop.png`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 7: Manual Refresh Control

- **Status:** complete
- **Started:** 2026-05-30 17:27:49 AEST
- Actions taken:
  - Moved result rendering into `components/ResultsApp.tsx` so the page can update in-place after a manual refresh.
  - Added a refresh button that is disabled until the visible cache is at least one hour old.
  - Added `GET /api/results/refresh` to enforce the one-hour limit on the server.
  - Added runtime in-memory refresh cache for the API route.
  - Kept the daily GitHub Action as the durable JSON cache path.
  - Updated styles for the refresh control and section tab buttons.
  - Verified the current under-one-hour cache shows a disabled refresh button with remaining wait time.
  - Verified the API returns `429 Too Many Requests` with `status: "too-fresh"` while cache is under one hour old.
- Files created/modified:
  - `app/page.tsx`
  - `app/globals.css`
  - `app/api/results/refresh/route.ts`
  - `components/ResultsApp.tsx`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 8: Original Source Link

- **Status:** complete
- Actions taken:
  - Confirmed WDTA results pages can be selected directly with GET parameters.
  - Added an `Original WDTA` button to the header action area.
  - Wired the button to the currently selected section code.
  - Verified Section 1 links to `section=AA016`.
  - Verified switching to Section 2 changes the link to `section=AA017`.
  - Captured a mobile screenshot with the source button visible.
- Files created/modified:
  - `components/ResultsApp.tsx`
  - `app/globals.css`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 9: Match Detail Panels

- **Status:** complete
- Actions taken:
  - Added match detail types for players, rubber rows, and match details.
  - Added parser support for WDTA `match_popup.php` pages.
  - Updated the fetch pipeline to request details for every played match with a `matchId`.
  - Ran `npm run refresh:data`; Section 1 parsed 6/6 played match details and Section 2 parsed 9/9.
  - Rendered detail panels inside played match cards.
  - Set latest round played match details to open by default.
  - Kept older detail panels collapsed by default.
  - Verified Section 1 and Section 2 detail counts and open panel counts with Playwright.
  - Captured a mobile detail screenshot.
- Files created/modified:
  - `lib/wdta/types.ts`
  - `lib/wdta/parse.ts`
  - `lib/wdta/fetch.ts`
  - `data/wdta-results.json`
  - `components/ResultsApp.tsx`
  - `app/globals.css`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 10: Ladder Standings

- **Status:** complete
- **Started:** 2026-05-30 18:18:00 AEST
- Actions taken:
  - Added ladder entry types and cache metadata for `laddersLoadedAt`.
  - Added parser support for WDTA ladder tables and finals-cut row markers.
  - Updated the fetch pipeline to request ladder pages for `AA016` and `AA017`.
  - Ran `npm run refresh:data`; Section 1 cached 5 ladder entries and Section 2 cached 7.
  - Rendered current ladder standings before the match-result rounds.
  - Added an `Original ladder` section link and per-team `Team ladder` links with `club=` parameters.
  - Verified mobile layout at 390px with the in-app browser.
  - Captured a mobile ladder screenshot.
- Files created/modified:
  - `lib/wdta/types.ts`
  - `lib/wdta/parse.ts`
  - `lib/wdta/fetch.ts`
  - `data/wdta-results.json`
  - `components/ResultsApp.tsx`
  - `app/globals.css`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
  - `artifacts/mobile-ladder.png`

### Phase 11: Remember Selected Section

- **Status:** complete
- Actions taken:
  - Read the current app entry and result component.
  - Added a section preference cookie read in `app/page.tsx`.
  - Persisted section selection from `components/ResultsApp.tsx` when users switch tabs.
  - Kept explicit `?section=` URLs authoritative and saved valid explicit selections.
  - Added a guarded localStorage write as a best-effort browser-local backup.
  - Verified reopening `/` after selecting Section 2 restores Section 2.
- Files created/modified:
  - `app/page.tsx`
  - `components/ResultsApp.tsx`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 12: New Results Notice

- **Status:** complete
- **Started:** 2026-05-30 18:27:06 AEST
- Actions taken:
  - Added a locally persisted last-seen results timestamp using `Results Loaded`.
  - Added a `New results available` banner when the current source timestamp differs from the stored timestamp.
  - Added a `Mark as seen` action that updates the stored timestamp and hides the banner.
  - Kept the first visit quiet by recording the current timestamp without a notice.
  - Added guarded localStorage plus cookie persistence for the timestamp.
  - Verified stale stored timestamp behavior in an isolated browser context.
  - Verified first-visit behavior in an isolated browser context.
- Files created/modified:
  - `components/ResultsApp.tsx`
  - `app/globals.css`
  - `README.md`
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

## Test Results

| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Source section check | POST `daytime=AA&section=AA016` | HTML contains Girls S/D Rubbers Section 1 | Confirmed | Pass |
| Documentation creation | Add README and planning files | Files exist in project root | Confirmed by file review and git status | Pass |
| Data refresh | `npm run refresh:data` | Writes 2 cached sections | Wrote AA016 and AA017 with 4 rounds each | Pass |
| Type check | `npm run typecheck` | No TypeScript errors in source | Passed | Pass |
| Lint | `npm run lint` | No lint errors | Passed | Pass |
| Build | `npm run build` | Production build succeeds | Passed | Pass |
| Dependency audit | `npm audit --audit-level=moderate` | No moderate or higher vulnerabilities | 0 vulnerabilities | Pass |
| Mobile visual check | Playwright 390x844 screenshot | Results render without horizontal overflow | 12 Section 1 cards, no overflow | Pass |
| Desktop visual check | Playwright 1024x900 screenshot | Results render without horizontal overflow | 12 Section 1 cards, no overflow | Pass |
| Section 2 route check | Playwright `/?section=AA017` at 390px | Section 2 tab active with cards | 16 cards, no overflow | Pass |
| Manual refresh disabled state | Playwright 390x844 with cache under 1 hour | Button disabled and shows remaining wait time | Disabled with remaining wait time, no overflow | Pass |
| Manual refresh server guard | `curl /api/results/refresh` with cache under 1 hour | Server refuses refresh | `429 Too Many Requests`, `status: "too-fresh"` | Pass |
| Original source link Section 1 | Playwright at `/?section=AA016` | Link targets source Section 1 | `section=AA016` | Pass |
| Original source link Section 2 | Click Section 2 tab | Link targets source Section 2 | `section=AA017` | Pass |
| Match detail cache Section 1 | `npm run refresh:data` | Every played Section 1 match has details | 6/6 detailed | Pass |
| Match detail cache Section 2 | `npm run refresh:data` | Every played Section 2 match has details | 9/9 detailed | Pass |
| Detail UI Section 1 | Playwright 390x844 | Details render; latest round open; no overflow | 6 panels, 2 open, no overflow | Pass |
| Detail UI Section 2 | Playwright 390x844 | Details render; latest round open; no overflow | 9 panels, 3 open, no overflow | Pass |
| Ladder cache Section 1 | `npm run refresh:data` | Section 1 has current ladder entries | 5 entries; first team `N'hill P'wood` | Pass |
| Ladder cache Section 2 | `npm run refresh:data` | Section 2 has current ladder entries | 7 entries; first team `Glenvale` | Pass |
| Ladder UI Section 1 | In-app browser 390x844 | Ladder is first section content, no overflow, links target source | `AA016` section link, `club=N%27hill+P%27wood`, no overflow | Pass |
| Ladder UI Section 2 | In-app browser 390x844 | Ladder is first section content, no overflow, links target source | `AA017` section link, `club=Glenvale`, no overflow | Pass |
| Remember explicit section | In-app browser `/?section=AA016` | Section 1 is active and remembered | Section 1 active; reopening `/` shows Section 1 | Pass |
| Remember clicked section | In-app browser click Section 2, then open `/` | Section 2 is active without query string | Section 2 active; no console errors; no overflow | Pass |
| New results first visit | Isolated browser context without seen timestamp | Store current timestamp and show no notice | No banner; timestamp cookie written; no overflow | Pass |
| New results stale seen timestamp | Isolated browser context with stale timestamp | Show notice, then hide after `Mark as seen` | Banner shown, hidden after click; timestamp updated; no errors | Pass |

## Error Log

| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-05-30 16:39:50 AEST | npm audit reported moderate PostCSS advisory through Next | 1 | Added npm override for `postcss`; reinstall verified 0 vulnerabilities. |
| 2026-05-30 16:39:50 AEST | TypeScript error: Cheerio no longer exports `Element` from the main module | 1 | Switched parser node typing to `AnyNode` from `domhandler`. |
| 2026-05-30 16:39:50 AEST | ESLint warning for using raw `<img>` in Next page | 1 | Switched decorative mark to `next/image`. |
| 2026-05-30 16:39:50 AEST | Direct `tsc` picked up Next 16 generated `.next/types/validator.ts` and failed despite `next build` passing | 1 | Added `tsconfig.typecheck.json` for source type checking and kept generated validation under `next build`. |
| 2026-05-30 16:39:50 AEST | Playwright package existed but browser binary was missing | 1 | Installed Chromium through the bundled Playwright CLI. |
| 2026-05-30 16:39:50 AEST | Playwright `networkidle` timed out on Next dev server | 1 | Switched to DOM selector waits and then production `next start`. |
| 2026-05-30 16:39:50 AEST | `next dev` accepted connections but did not return content under local Node 23.11 | 1 | Used production server for verification; build/start works. |
| 2026-05-30 17:27:49 AEST | Manual refresh could not exercise success path because current cache was still under one hour old | 1 | Verified fetch path separately via `npm run refresh:data` and verified API guard/UI disabled state for the current cache. |
| 2026-05-30 18:18:00 AEST | Browser verification variable name was already declared in the persistent browser session | 1 | Retried with unique reusable variable names; ladder UI verification passed. |
| 2026-05-30 18:35:00 AEST | Lint rejected synchronous `setState` inside an effect while restoring localStorage | 1 | Removed effect-based state restoration and used the server-readable cookie as the primary persistence path. |
| 2026-05-30 18:35:00 AEST | Browser verification sandbox did not expose localStorage for test cleanup | 1 | Made localStorage persistence best-effort and verified behavior through real page navigation and cookie-backed rendering. |
| 2026-05-30 18:27:06 AEST | In-app browser evaluation sandbox would not let test code write cookies directly | 1 | Used an isolated Playwright context with a preloaded cookie for stale-timestamp verification. |

## 5-Question Reboot Check

| Question | Answer |
|----------|--------|
| Where am I? | MVP implementation plus manual refresh, source links, match detail panels, ladder standings, remembered section, and new-results notice are complete. |
| Where am I going? | Commit and push the new-results notice update so Vercel can redeploy. |
| What's the goal? | Build and document the WDTA mobile results app with daily caching for Girls S/D Rubbers Sections 1 and 2. |
| What have I learned? | See `findings.md`. |
| What have I done? | Created README, planning files, Next.js app, parser/cache workflow, mobile UI, ladder standings, remembered-section behavior, new-results notice, and verification artifacts. |
