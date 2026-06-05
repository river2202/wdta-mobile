import { sql } from "@vercel/postgres";

export { sql };

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
