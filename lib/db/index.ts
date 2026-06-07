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
}
