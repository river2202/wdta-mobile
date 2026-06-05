import { sql } from "./index";
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

/** Returns all sections whose cache is older than maxAgeMs milliseconds. */
export async function getStaleSectionCodes(maxAgeMs: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  const result = await sql<{ code: string }>`
    SELECT si.code
    FROM section_index si
    LEFT JOIN section_cache sc ON sc.section_code = si.code
    WHERE sc.section_code IS NULL
       OR sc.refreshed_at < ${cutoff}::timestamptz
    ORDER BY si.code
  `;
  return result.rows.map((r) => r.code);
}
