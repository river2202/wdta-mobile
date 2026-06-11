import { query, sql } from "./index";
import { extractAppearances, type PlayerAppearanceRow } from "@/lib/wdta/appearances";
import type { CachedResults } from "@/lib/wdta/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompetitionRow = {
  code: string;
  name: string;
  discovered_at: string;
};

export type SectionRow = {
  code: string;
  name: string;
  competition_code: string;
  discovered_at: string;
};

export type SectionCacheRow = {
  section_code: string;
  results_json: CachedResults;
  generated_at: string;
  refreshed_at: string;
};

// ---------------------------------------------------------------------------
// Competition index
// ---------------------------------------------------------------------------

export async function getCompetitions(): Promise<CompetitionRow[]> {
  const result = await sql<CompetitionRow>`
    SELECT code, name, discovered_at
    FROM competition_index
    ORDER BY code
  `;
  return result.rows;
}

export async function upsertCompetition(code: string, name: string): Promise<void> {
  await sql`
    INSERT INTO competition_index (code, name)
    VALUES (${code}, ${name})
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  `;
}

// ---------------------------------------------------------------------------
// Section index
// ---------------------------------------------------------------------------

export async function getSections(competitionCode: string): Promise<SectionRow[]> {
  const result = await sql<SectionRow>`
    SELECT code, name, competition_code, discovered_at
    FROM section_index
    WHERE competition_code = ${competitionCode}
    ORDER BY code
  `;
  return result.rows;
}

export async function getSection(sectionCode: string): Promise<SectionRow | null> {
  const result = await sql<SectionRow>`
    SELECT code, name, competition_code, discovered_at
    FROM section_index
    WHERE code = ${sectionCode}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function getAllSections(): Promise<SectionRow[]> {
  const result = await sql<SectionRow>`
    SELECT code, name, competition_code, discovered_at
    FROM section_index
    ORDER BY competition_code, code
  `;
  return result.rows;
}

export async function upsertSection(
  code: string,
  name: string,
  competitionCode: string,
): Promise<void> {
  await sql`
    INSERT INTO section_index (code, name, competition_code)
    VALUES (${code}, ${name}, ${competitionCode})
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  `;
}

// ---------------------------------------------------------------------------
// Section cache
// ---------------------------------------------------------------------------

export async function getSectionCache(sectionCode: string): Promise<SectionCacheRow | null> {
  const result = await sql<SectionCacheRow>`
    SELECT section_code, results_json, generated_at, refreshed_at
    FROM section_cache
    WHERE section_code = ${sectionCode}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function upsertSectionCache(
  sectionCode: string,
  results: CachedResults,
): Promise<void> {
  await sql`
    INSERT INTO section_cache (section_code, results_json, generated_at, refreshed_at)
    VALUES (
      ${sectionCode},
      ${JSON.stringify(results)}::jsonb,
      ${results.generatedAt}::timestamptz,
      NOW()
    )
    ON CONFLICT (section_code) DO UPDATE SET
      results_json = EXCLUDED.results_json,
      generated_at = EXCLUDED.generated_at,
      refreshed_at = NOW()
  `;
}

export type StaleSection = {
  code: string;
  competition_code: string;
};

/**
 * Returns up to `limit` sections whose cache is older than maxAgeMs (or never
 * cached), stalest first (never-cached before oldest). Used by the cron to
 * refresh a bounded, staggered batch each run.
 */
export async function getStaleSections(maxAgeMs: number, limit: number): Promise<StaleSection[]> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const result = await sql<StaleSection>`
    SELECT si.code, si.competition_code
    FROM section_index si
    LEFT JOIN section_cache sc ON sc.section_code = si.code
    WHERE sc.section_code IS NULL
       OR sc.refreshed_at < ${cutoff}::timestamptz
    ORDER BY sc.refreshed_at ASC NULLS FIRST
    LIMIT ${limit}
  `;
  return result.rows;
}

/** Count how many sections are currently stale (older than maxAgeMs or never cached). */
export async function countStaleSections(maxAgeMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const result = await sql<{ n: number }>`
    SELECT COUNT(*)::int AS n
    FROM section_index si
    LEFT JOIN section_cache sc ON sc.section_code = si.code
    WHERE sc.section_code IS NULL
       OR sc.refreshed_at < ${cutoff}::timestamptz
  `;
  return result.rows[0]?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Player appearances
// ---------------------------------------------------------------------------

export type PlayerAppearanceDbRow = {
  player_label: string;
  team: string;
  competition_code: string;
  section_code: string;
  section_name: string;
  round: number;
  match_date: string | null;
  match_id: string;
  opponent: string;
  position: string;
  emergency: boolean;
  team_points: number | null;
  opp_points: number | null;
};

/** Replace all appearance rows for a section (delete + batch insert). */
export async function replaceSectionAppearances(
  sectionCode: string,
  rows: PlayerAppearanceRow[],
): Promise<void> {
  await sql`DELETE FROM player_appearance WHERE section_code = ${sectionCode}`;
  if (rows.length === 0) return;

  await query(
    `INSERT INTO player_appearance
       (player_key, player_label, team, competition_code, section_code, section_name,
        round, match_date, match_id, opponent, position, emergency, team_points, opp_points)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::int[], $8::text[], $9::text[], $10::text[], $11::text[], $12::boolean[],
       $13::real[], $14::real[]
     )
     ON CONFLICT (match_id, player_key, position) DO UPDATE SET
       player_label = EXCLUDED.player_label,
       team = EXCLUDED.team,
       competition_code = EXCLUDED.competition_code,
       section_name = EXCLUDED.section_name,
       round = EXCLUDED.round,
       match_date = EXCLUDED.match_date,
       opponent = EXCLUDED.opponent,
       emergency = EXCLUDED.emergency,
       team_points = EXCLUDED.team_points,
       opp_points = EXCLUDED.opp_points`,
    [
      rows.map((r) => r.playerKey),
      rows.map((r) => r.playerLabel),
      rows.map((r) => r.team),
      rows.map((r) => r.competitionCode),
      rows.map((r) => r.sectionCode),
      rows.map((r) => r.sectionName),
      rows.map((r) => r.round),
      rows.map((r) => r.matchDate),
      rows.map((r) => r.matchId),
      rows.map((r) => r.opponent),
      rows.map((r) => r.position),
      rows.map((r) => r.emergency),
      rows.map((r) => r.teamPoints),
      rows.map((r) => r.oppPoints),
    ],
  );
}

export async function getPlayerAppearances(playerKey: string): Promise<PlayerAppearanceDbRow[]> {
  const result = await sql<PlayerAppearanceDbRow>`
    SELECT player_label, team, competition_code, section_code, section_name, round,
           match_date, match_id, opponent, position, emergency, team_points, opp_points
    FROM player_appearance
    WHERE player_key = ${playerKey}
  `;
  return result.rows;
}

/** Persist a section's results AND its derived player appearances together. */
export async function saveSectionResults(
  sectionCode: string,
  results: CachedResults,
): Promise<void> {
  await upsertSectionCache(sectionCode, results);
  await replaceSectionAppearances(sectionCode, extractAppearances(results));
}
