import type { Metadata } from "next";

import { TeamFixture } from "@/components/TeamFixture";
import { TeamFixtureLoader } from "@/components/TeamFixtureLoader";
import {
  getSection,
  getSectionCache,
  getTeamFixtureCache,
} from "@/lib/db/queries";
import { deriveCompetitionCode } from "@/lib/wdta/fetch";
import type { RoundResult } from "@/lib/wdta/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ section: string; team: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section, team } = await params;

  let teamName = team;
  let sectionName = section;
  try {
    const cached = await getTeamFixtureCache(section, team);
    if (cached) {
      teamName = cached.data_json.teamName;
      sectionName = cached.data_json.sectionName || section;
    }
  } catch {
    // fall back to codes
  }

  return {
    title: `${teamName} — fixture & venues`,
    description: `${teamName}'s ${sectionName} season fixture in the WDTA (Waverley & District Tennis Association): dates, opponents, results, venues and directions.`,
    alternates: { canonical: `/team/${encodeURIComponent(section)}/${encodeURIComponent(team)}` },
  };
}

// Fixtures rarely change — a day of freshness is plenty.
function isCacheFresh(refreshedAt: string): boolean {
  return Date.now() - Date.parse(refreshedAt) < 24 * 60 * 60 * 1000;
}

export default async function TeamPage({ params }: PageProps) {
  const { section: sectionCode, team: teamCode } = await params;

  // Read-only DB lookups; any TROLS fetching happens via the API route.
  let competitionCode = deriveCompetitionCode(sectionCode);
  let resultRounds: RoundResult[] = [];
  let fixtureCache = null;

  try {
    const [sectionRow, resultsCache, fixture] = await Promise.all([
      getSection(sectionCode),
      getSectionCache(sectionCode),
      getTeamFixtureCache(sectionCode, teamCode),
    ]);
    if (sectionRow) competitionCode = sectionRow.competition_code;
    resultRounds = resultsCache?.results_json.sections[0]?.rounds ?? [];
    fixtureCache = fixture;
  } catch (error) {
    console.error(`[team] DB read failed for ${sectionCode}/${teamCode}:`, error);
  }

  if (fixtureCache && isCacheFresh(fixtureCache.refreshed_at)) {
    return (
      <TeamFixture
        fixture={fixtureCache.data_json}
        sectionCode={sectionCode}
        teamCode={teamCode}
        competitionCode={competitionCode}
        resultRounds={resultRounds}
      />
    );
  }

  return (
    <TeamFixtureLoader
      sectionCode={sectionCode}
      teamCode={teamCode}
      competitionCode={competitionCode}
      resultRounds={resultRounds}
    />
  );
}
