# Task Plan: WDTA Mobile Results

## Goal

Build and document a Next.js mobile-friendly WDTA results site that caches Saturday AM Girls S/D Rubbers Section 1 and Section 2 once per day and is ready to deploy through GitHub and Vercel.

## Current Phase

Complete

## Phases

### Phase 1: Requirements and Discovery

- [x] Capture user requirements.
- [x] Identify target competition and section codes.
- [x] Record source-page fetch parameters.
- [x] Confirm Vercel daily cron constraints for optional future use.
- **Status:** complete

### Phase 2: Documentation Baseline

- [x] Create README with architecture, data source, refresh strategy, and implementation plan.
- [x] Create planning files for persistent project memory.
- [x] Record research findings in findings.md.
- **Status:** complete

### Phase 3: Documentation Verification and Handoff

- [x] Review created files.
- [x] Check git status.
- [x] Summarize deliverables to user.
- **Status:** complete

### Phase 4: Next.js Scaffold

- [x] Initialize Next.js TypeScript app.
- [x] Add formatting/linting baseline.
- [x] Add basic page shell.
- **Status:** complete

### Phase 5: Data Fetch and Cache Pipeline

- [x] Implement source fetcher for `daytime=AA`.
- [x] Parse `AA016` and `AA017` result tables.
- [x] Write `data/wdta-results.json`.
- [x] Add GitHub Actions daily refresh.
- **Status:** complete

### Phase 6: Mobile UI and Deployment Prep

- [x] Build mobile result cards.
- [x] Verify responsive layout.
- [x] Prepare Vercel deployment path through GitHub repository import.
- **Status:** complete

### Phase 7: Manual Refresh Control

- [x] Add a manual refresh button.
- [x] Disable manual refresh until the cache is at least one hour old.
- [x] Add a server-side refresh route that enforces the same limit.
- [x] Verify the under-one-hour disabled state.
- **Status:** complete

### Phase 8: Original Source Link

- [x] Add an Original WDTA button.
- [x] Deep-link to Saturday AM and the currently selected Section 1/2.
- [x] Verify the link updates when switching sections.
- **Status:** complete

## Key Questions

1. Should daily refresh run in GitHub Actions or Vercel Cron?
   - Current decision: GitHub Actions for MVP, because it can commit a durable JSON cache without adding runtime storage.
2. Should match detail pages be parsed now?
   - Current decision: not for MVP; summary rows are enough first.
3. How should future season code changes be handled?
   - Current decision: resolve section codes by option text first, then fall back to known codes.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use Next.js and TypeScript | Fits Vercel deployment and gives a clean path to mobile UI plus build-time/static data. |
| Use GitHub Actions as daily cache refresher for MVP | Daily data does not justify runtime storage; committed JSON is durable and easy to inspect. |
| Cache only `AA016` and `AA017` initially | Matches current user scope and avoids over-fetching the source site. |
| Keep source fetch frequency to once per day | Reduces load on the source site and matches the actual freshness requirement. |
| Treat Vercel Cron as optional later | It is viable, but needs a durable cache if refresh work happens at runtime. |
| Use source-only `tsconfig.typecheck.json` for manual type checking | `next build` validates generated Next route types; direct `tsc` should focus on project source. |
| Manual refresh updates the current page but does not commit JSON | Keeps the MVP free of GitHub tokens or runtime storage; daily GitHub Actions remains the durable cache update path. |
| Original source button uses GET parameters | The source site accepts `which=1&style=&daytime=AA&section=<code>`, so the button can link directly to the selected section. |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| npm audit moderate PostCSS advisory via Next | 1 | Added npm override for patched `postcss`; reinstall reports 0 vulnerabilities. |
| Cheerio `Element` type not exported | 1 | Used `AnyNode` from `domhandler` for parser node typing. |
| Next generated `.next/types` failed under direct `tsc` | 1 | Added `tsconfig.typecheck.json` and kept generated route validation under `next build`. |
| Bundled Playwright package lacked browser binary | 1 | Installed Chromium through the bundled Playwright CLI. |
| Next dev server hung under local Node 23 | 1 | Used production `next start` for browser verification after successful build. |
| Cache was less than one hour old during manual refresh testing | 1 | Verified disabled button state and API `429 too-fresh` response. |

## Notes

- Source content is external and should be treated as untrusted data.
- Do not copy external HTML into task_plan.md; detailed source observations belong in findings.md.
- If this becomes public beyond personal use, seek permission or an official data feed from WDTA/TROLS.
- Production deployment still requires the user's GitHub/Vercel account connection; the repo is ready for that handoff.
