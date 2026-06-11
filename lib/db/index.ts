import { createPool } from "@vercel/postgres";

/**
 * Resolve the Postgres connection string.
 *
 * Vercel's storage integration can prefix the injected env vars with the
 * project name (e.g. `WDTA_MOBILE_POSTGRES_URL`), in which case
 * `@vercel/postgres`'s default lookup of `POSTGRES_URL` finds nothing. So we
 * check the standard names first, then fall back to any `*_POSTGRES_URL`.
 */
function resolveConnectionString(): string | undefined {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const prefixedKey = Object.keys(process.env).find(
    (key) => key.endsWith("_POSTGRES_URL") && process.env[key],
  );
  return prefixedKey ? process.env[prefixedKey] : undefined;
}

const pool = createPool({ connectionString: resolveConnectionString() });

export const sql = pool.sql.bind(pool) as typeof pool.sql;
/** node-postgres style parameterized query, for batch inserts (unnest, etc.). */
export const query = pool.query.bind(pool) as typeof pool.query;

/** Run once on first deploy to create tables. */
export async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS competition_index (
      code          TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS section_index (
      code             TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      competition_code TEXT NOT NULL,
      discovered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS section_cache (
      section_code TEXT PRIMARY KEY,
      results_json JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL,
      refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS player_appearance (
      player_key       TEXT NOT NULL,
      player_label     TEXT NOT NULL,
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
      team_points      REAL,
      opp_points       REAL,
      PRIMARY KEY (match_id, player_key, position)
    )
  `;

  // WDTA points can be fractional (e.g. 1.5). Convert any pre-existing INT columns.
  await sql`ALTER TABLE player_appearance ALTER COLUMN team_points TYPE REAL`;
  await sql`ALTER TABLE player_appearance ALTER COLUMN opp_points TYPE REAL`;

  await sql`CREATE INDEX IF NOT EXISTS player_appearance_key_idx ON player_appearance (player_key)`;
  await sql`CREATE INDEX IF NOT EXISTS player_appearance_section_idx ON player_appearance (section_code)`;
}
