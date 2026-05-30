# Findings & Decisions

## Requirements

- Build a mobile-friendly replacement view for WDTA results.
- Use Vercel, GitHub, and Next.js.
- Refresh at very low frequency: once per day.
- For now, cache only Saturday AM Girls S/D Rubbers Section 1 and Section 2.
- Use the `planning-with-files-zh` workflow with `task_plan.md`, `findings.md`, and `progress.md`.

## Research Findings

- WDTA results page: `https://www.trols.org.au/wdta/results.php`.
- Waverley ladder page: `https://www.waverleytennis.asn.au/ladders.html`.
- The Waverley ladder page embeds the TROLS ladder app, so deep links use `https://www.trols.org.au/wdta/ladders.php`.
- Competition selector currently uses `daytime=AA` for `Saturday AM - Winter 2026`.
- Section IDs currently observed:
  - `AA016`: `Girls S/D Rubbers Section 1`
  - `AA017`: `Girls S/D Rubbers Section 2`
- Section results are fetched by POSTing to the results page with `which=1&style=&daytime=AA&section=<sectionCode>`.
- The source page renders result data in HTML tables, not JSON.
- Summary rows include played matches, byes, wash outs, and forfeits.
- Played match rows can contain a match ID in `open_match(event,'','AA017041')`.
- Match details can be fetched from `match_popup.php?matchid=<matchId>&seasonid=` and include player names plus set scores.
- The source page showed `Results Loaded: 26th May 26 @ 06:02:45 PM` during inspection on 2026-05-30.
- Vercel Cron Jobs call a production deployment path with HTTP GET.
- Vercel cron schedules use UTC.
- Vercel Hobby supports daily cron frequency, which matches the desired refresh rate.
- Vercel Cron is optional for this MVP because GitHub Actions can refresh and commit a durable JSON cache once per day.
- Implementation generated `data/wdta-results.json` with both requested sections.
- Section 1 (`AA016`) parsed with 4 rounds.
- Section 2 (`AA017`) parsed with 4 rounds.
- Section 1 default mobile render has 12 match cards.
- Section 2 mobile render has 16 match cards.
- Playwright layout checks at 390px and 1024px found no horizontal overflow.
- Manual refresh button displays remaining wait time and is disabled while the cache is less than one hour old.
- `GET /api/results/refresh` returns `429 Too Many Requests` with `status: "too-fresh"` while the cache is younger than one hour.
- The source site supports deep-linking selected result pages via GET, e.g. `results.php?which=1&style=&daytime=AA&section=AA016`.
- The Original WDTA button updates its link from `AA016` to `AA017` when the user switches sections.
- The ladder source supports deep-linking selected section pages via GET, e.g. `ladders.php?which=1&style=&daytime=AA&section=AA016`.
- The ladder source also supports club-focused pages via GET, e.g. `ladders.php?which=2&style=&daytime=AA&club=Knox+Gardens`.
- Current Section 1 ladder parse returned 5 teams, led by `N'hill P'wood` with 23 points.
- Current Section 2 ladder parse returned 7 teams, led by `Glenvale` with 20.5 points.
- Ladder pages showed `Ladders Loaded: 26th May 26 @ 06:02:45 PM` during inspection on 2026-05-30.
- WDTA match popup pages expose team rosters, emergency markers, rubber combinations, and set scores in nested tables.
- `AA016` currently has 6 played matches and all 6 parsed with details.
- `AA017` currently has 9 played matches and all 9 parsed with details.
- Latest round details open by default: 2 panels for Section 1, 3 panels for Section 2.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Start with documentation before scaffolding | User explicitly requested README first. |
| Use GitHub Actions for daily refresh in the recommended MVP | Avoids adding runtime storage and keeps the last good JSON cache in the repository. |
| Keep Vercel Cron as a documented alternative | Useful later if refresh moves into Vercel, but not necessary for a static JSON cache. |
| Parse section codes by visible text when possible | Section codes may change between seasons. |
| Fall back to `AA016` and `AA017` | These are the currently observed codes for the requested sections. |
| Do not parse match popup details in v1 | Summary results are the immediate mobile pain point. |
| Use a source-only TypeScript config for `npm run typecheck` | Next generated route validation is covered by `next build`; source type checking should not depend on stale `.next` artifacts. |
| Keep manual refresh non-durable for now | Avoids adding GitHub API tokens or Vercel storage; durable refresh remains the daily GitHub Action. |
| Use same-tab external navigation for Original WDTA | User asked for a jump to the original data site; the app URL is easy to return to through browser history. |
| Store match details inside each played `MatchResult` | Keeps card rendering simple and lets manual refresh update details together with summary results. |
| Default-open all played matches in the latest round | Interprets "recent" as the newest round and avoids picking an arbitrary match from that round. |
| Store ladder standings inside each `SectionResults` | Keeps the selected section self-contained for rendering and manual refresh updates. |
| Use TROLS ladder URLs for original links | The Waverley page is a wrapper, while TROLS URLs can select the requested section or team. |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Source site is old table-based HTML | Parse with `cheerio` and transform into typed JSON. |
| Browser-facing fetch would likely hit CORS limits | Fetch from server-side scripts/actions, then render cached JSON in the browser. |
| Source `robots.txt` currently disallows `/wdta/` | Keep refresh daily, cache aggressively, and seek permission before broad public use. |
| Local `next dev` hung under Node 23.11 | Verified with `next build` and production `next start`; GitHub Actions uses Node 22. |
| npm audit reported PostCSS advisory through Next | Added npm override to use patched PostCSS; reinstall reports 0 vulnerabilities. |

## Resources

- WDTA results page: https://www.trols.org.au/wdta/results.php
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Cron usage and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Cron quickstart: https://vercel.com/docs/cron-jobs/quickstart

## Visual/Browser Findings

- The original page is fixed-width table layout and not suitable for mobile reading.
- Section summary table uses columns for Home Team, home points/rubbers/sets/games, away points/rubbers/sets/games, and Away Team.
- Some rows include venue notes such as `Playing @ St Marys Primary School`.
- Mobile UI converts rows into cards grouped by round.
- Mobile screenshot after implementation showed readable round groups, section tabs, score cards, and compact status cards.
- Mobile detail screenshot showed latest round player lists and rubber scores open by default with no horizontal overflow.
- Mobile ladder screenshot showed the ladder panel at the top of Section 2, 7 ladder rows, no horizontal overflow at 390px, and team links carrying the `club` parameter.
- Remembered-section verification showed Section 2 remains active when reopening `/` after selecting Section 2; explicit `?section=AA016` still overrides the remembered value.
