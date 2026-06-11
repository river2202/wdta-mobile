import { NextResponse } from "next/server";

import { getSectionCache, getSection, upsertSection, saveSectionResults } from "@/lib/db/queries";
import { deriveCompetitionCode, fetchSingleSectionResults } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // on-demand fetch of one section can take a few seconds

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code: sectionCode } = await params;

  try {
    const cached = await getSectionCache(sectionCode);
    const now = Date.now();
    const generatedTime = cached ? Date.parse(cached.generated_at) : NaN;
    const isFresh = !Number.isNaN(generatedTime) && now - generatedTime < CACHE_MAX_AGE_MS;

    if (cached && isFresh) {
      return NextResponse.json({
        status: "cached",
        results: cached.results_json,
        cachedAt: cached.refreshed_at,
      });
    }

    // Stale or missing — fetch fresh from TROLS
    const section = await getSection(sectionCode);
    const competitionCode = section?.competition_code ?? deriveCompetitionCode(sectionCode);

    const fresh = await fetchSingleSectionResults(competitionCode, sectionCode);

    // Update section index (in case this is first fetch)
    await upsertSection(
      sectionCode,
      fresh.sections[0]?.sectionName ?? sectionCode,
      competitionCode,
    );
    await saveSectionResults(sectionCode, fresh);

    return NextResponse.json({
      status: "refreshed",
      results: fresh,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load results" },
      { status: 502 },
    );
  }
}
