-- WDTA Mobile Results — database schema
-- Run once via: npm run db:migrate

CREATE TABLE IF NOT EXISTS competition_index (
  code          TEXT PRIMARY KEY,          -- e.g. "AA"
  name          TEXT NOT NULL,             -- e.g. "Saturday AM - Winter 2026"
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_index (
  code             TEXT PRIMARY KEY,       -- e.g. "AA016"
  name             TEXT NOT NULL,          -- e.g. "Girls S/D Rubbers Section 1"
  competition_code TEXT NOT NULL REFERENCES competition_index(code) ON DELETE CASCADE,
  discovered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_cache (
  section_code TEXT PRIMARY KEY REFERENCES section_index(code) ON DELETE CASCADE,
  results_json JSONB NOT NULL,             -- full CachedResults JSON (single section)
  generated_at TIMESTAMPTZ NOT NULL,       -- timestamp from results.generatedAt
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-player match appearances, derived from cached match rosters.
-- Rewritten per section on each refresh (delete + batch insert).
CREATE TABLE IF NOT EXISTS player_appearance (
  player_key       TEXT NOT NULL,          -- normalized name (lowercase, single spaces)
  player_label     TEXT NOT NULL,          -- display name
  team             TEXT NOT NULL,
  competition_code TEXT NOT NULL,
  section_code     TEXT NOT NULL,
  section_name     TEXT NOT NULL,
  round            INT  NOT NULL,
  match_date       TEXT,
  match_id         TEXT NOT NULL,
  opponent         TEXT NOT NULL,
  position         TEXT NOT NULL DEFAULT '',
  emergency        BOOLEAN NOT NULL DEFAULT FALSE,
  team_points      REAL,                    -- points can be fractional (e.g. 1.5)
  opp_points       REAL,
  PRIMARY KEY (match_id, player_key, position)
);

CREATE INDEX IF NOT EXISTS player_appearance_key_idx     ON player_appearance (player_key);
CREATE INDEX IF NOT EXISTS player_appearance_section_idx ON player_appearance (section_code);
