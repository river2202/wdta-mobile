# Data fetching & refresh

How WDTA results get from the TROLS source site into the app, and how to deploy
the daily refresh on **Vercel + Neon (free tier)**.

---

## 1. Overview

The app never talks to a database from the browser and never scrapes TROLS
during page render. Data flows through three layers:

```
TROLS (trols.org.au/wdta)
  │  fetch + parse (lib/wdta/*)
  ▼
Neon Postgres  ──read──►  Next.js pages (/, /results)
  ▲
  │  writes happen from server-only code:
  ├─ on-demand   : GET /api/sections/[code]/results   (first visit to a section)
  ├─ background  : GET /api/sections/[code]/refresh   (client triggers when cache > 2h)
  └─ scheduled   : GET /api/cron/refresh-all          (Vercel Cron, daily, batched)
```

`/results` is a **read-only** DB lookup, so it can never time out. All TROLS
fetching happens inside API routes (which have their own time budget) or the
cron, never in the page render path.

---

## 2. The scraping logic (`lib/wdta`)

### Source endpoints

| Purpose | Request |
|---------|---------|
| Competition list | `GET results.php` → parse `#daytime` options |
| Section list | `POST results.php` `which=0&daytime=<comp>` → parse `#section` options |
| Section results | `POST results.php` `which=1&daytime=<comp>&section=<code>` → results table |
| Ladder | `GET ladders.php?which=1&daytime=<comp>&section=<code>` |
| Match details | `GET match_popup.php?matchid=<id>` (one per played match) |

Parsing is done with Cheerio in `lib/wdta/parse.ts`. The shapes are defined in
`lib/wdta/types.ts` (`CachedResults` → `SectionResults` → `RoundResult` →
`MatchResult` + `LadderEntry`).

### Key functions (`lib/wdta/fetch.ts`)

- `fetchCompetitionOptions()` — discover all competitions.
- `fetchSectionOptions(competitionCode)` — discover all sections in a competition.
- `fetchSingleSectionResults(competitionCode, sectionCode)` — the workhorse:
  fetches the competition meta, the section results table, the ladder, then every
  played match's detail popup, and returns a one-section `CachedResults`.

### Robustness (why it doesn't time out or get rate-limited)

These guards live in `lib/wdta/fetch.ts`:

| Guard | Value | Why |
|-------|-------|-----|
| Per-request timeout | `FETCH_TIMEOUT_MS = 8000` | One slow TROLS response can't stall the whole job (`fetchWithTimeout` uses `AbortController`). |
| Match-detail concurrency | `DETAIL_CONCURRENCY = 5` | Fetch popups 5 at a time — fast, but gentle on the source (`mapWithConcurrency`). |
| Non-fatal detail failures | — | A single broken popup is skipped; the scoreline still shows from the section table. |

A section typically has 20–45 match popups; with concurrency 5 + an 8s ceiling,
one section refreshes in a few seconds.

---

## 3. Freshness layers

| Layer | Trigger | Endpoint | Freshness rule |
|-------|---------|----------|----------------|
| On-demand | First visit to an uncached section | `GET /api/sections/[code]/results` | Serves cache if < 24h, else fetches & caches |
| Background | `ResultsApp` on open, cache > 2h | `GET /api/sections/[code]/refresh` | Server rate-limits to once per 1h |
| Scheduled | Vercel Cron, daily | `GET /api/cron/refresh-all` | Refreshes sections stale > 12h |

Because users' own visits keep the sections they look at fresh (on-demand + 2h
background refresh), the cron only needs to keep the broader set warm. WDTA
results update weekly (after Saturday play), so daily is plenty.

---

## 4. The cron: batched & staggered

`app/api/cron/refresh-all/route.ts`

```
maxDuration   = 60     # Hobby-safe function ceiling (seconds)
STALE_AFTER_MS = 12h   # only refresh sections older than this
BATCH_SIZE     = 6     # sections attempted per run
STAGGER_MS     = 1500  # pause between sections (avoid rate-limiting)
TIME_BUDGET_MS = 50s   # stop starting new sections past this; rest roll over
```

Each run:

1. Authenticates the request (see §6).
2. `getStaleSections(STALE_AFTER_MS, BATCH_SIZE)` returns the **stalest** sections
   first (never-cached before oldest-cached).
3. Refreshes them one at a time, waiting `STAGGER_MS` between each.
4. Stops starting new sections once `TIME_BUDGET_MS` is hit; the rest are picked
   up next run.

So one run never blows the function timeout, and over several daily runs the
whole index rotates through. Sections users actually open are handled instantly
by the on-demand layer regardless.

---

## 5. Deploy on Vercel + Neon (free tier)

### 5.1 Create the database (Neon)

1. Vercel dashboard → your project → **Storage** → **Create Database** → **Neon
   (Serverless Postgres)**.
2. Accept the defaults (free plan). Vercel links it to the project and **auto-injects**
   the `POSTGRES_*` env vars (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, …) into
   all environments (Production / Preview / Development).

### 5.2 Pull env vars locally & migrate

```bash
# Option A: copy the .env.local snippet from the Neon storage page into .env.local
# Option B: vercel env pull .env.local

npm run db:migrate     # creates competition_index, section_index, section_cache
```

The migration (`scripts/db-migrate.ts` → `runMigrations()`) is idempotent
(`CREATE TABLE IF NOT EXISTS`). Production uses the **same** Neon database, so
running it once locally is enough.

> `db:migrate` loads `.env.local` via `tsx --env-file=.env.local`.

### 5.3 Set the remaining env vars (Vercel → Settings → Environment Variables)

| Var | Required | Notes |
|-----|----------|-------|
| `POSTGRES_*` | yes | Auto-added by the Neon integration. |
| `CRON_SECRET` | yes | Any random string. Protects the cron route (see §6). |
| `NEXT_PUBLIC_BUYMEACOFFEE_URL` | no | Footer / header donate link. |

After adding `CRON_SECRET`, redeploy so it takes effect.

### 5.4 Cron config

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/refresh-all", "schedule": "0 20 * * *" }]
}
```

- Schedules are **UTC**. `0 20 * * *` = 20:00 UTC ≈ early morning Melbourne.
- Vercel detects `vercel.json` on deploy and registers the cron automatically —
  no extra setup. Check **Project → Cron Jobs** after deploy.

### 5.5 Free-tier limits to know

**Vercel Hobby**
- Cron granularity is **once per day**, max **2 cron jobs**. The daily schedule
  above is compliant.
- Serverless functions cap at **60s** — hence `maxDuration = 60` and the cron's
  time budget / batching.
- To clear the refresh backlog faster you need **Pro**, which allows frequent
  crons (e.g. hourly `0 * * * *`); then `BATCH_SIZE` × runs/day covers everything.

**Neon free**
- ~0.5 GB storage (this app stores small JSON blobs — plenty).
- Compute **auto-suspends** when idle; the first query after a pause has a small
  cold-start delay. `@vercel/postgres` uses the pooled `POSTGRES_URL`.

---

## 6. Cron authentication

When `CRON_SECRET` is set, Vercel Cron automatically sends
`Authorization: Bearer <CRON_SECRET>` with each scheduled request. The route
rejects anything else:

```ts
const authHeader = req.headers.get("Authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

To trigger it manually for testing:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-app>.vercel.app/api/cron/refresh-all
```

---

## 7. Source etiquette

TROLS `robots.txt` disallows `/wdta/`. Keep traffic low: cache aggressively
(24h on-demand, 12h cron), stagger requests, and limit detail concurrency. If
this is published more widely, ask WDTA/TROLS for permission or a data feed.
