import { NextResponse } from "next/server";

import {
  getSection,
  getTeamFixtureCache,
  upsertTeamFixtureCache,
} from "@/lib/db/queries";
import { deriveCompetitionCode, fetchTeamFixture } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Fixtures rarely change once published — a day of freshness is plenty.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Params = { params: Promise<{ section: string; team: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { section: sectionCode, team: teamCode } = await params;

  try {
    const cached = await getTeamFixtureCache(sectionCode, teamCode);
    const isFresh =
      cached && Date.now() - Date.parse(cached.refreshed_at) < CACHE_MAX_AGE_MS;

    if (cached && isFresh) {
      return NextResponse.json({ status: "cached", data: cached.data_json });
    }

    const section = await getSection(sectionCode);
    const competitionCode = section?.competition_code ?? deriveCompetitionCode(sectionCode);

    const fresh = await fetchTeamFixture(competitionCode, sectionCode, teamCode);
    await upsertTeamFixtureCache(sectionCode, teamCode, fresh);

    return NextResponse.json({ status: "refreshed", data: fresh });
  } catch (error) {
    console.error(`[teams/fixture] failed for ${sectionCode}/${teamCode}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load fixture" },
      { status: 502 },
    );
  }
}
