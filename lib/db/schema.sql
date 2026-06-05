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
