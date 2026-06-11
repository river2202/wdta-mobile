import { NextResponse } from "next/server";

import { getSectionCache, getSection, upsertSection, saveSectionResults } from "@/lib/db/queries";
import { deriveCompetitionCode, fetchSingleSectionResults } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // fetching one section can take a few seconds

const MIN_REFRESH_AGE_MS = 60 * 60 * 1000; // 1 hour

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code: sectionCode } = await params;

  try {
    const cached = await getSectionCache(sectionCode);
    const now = Date.now();

    if (cached) {
      const refreshedTime = Date.parse(cached.refreshed_at);
      const remainingMs = Math.max(0, refreshedTime + MIN_REFRESH_AGE_MS - now);

      if (remainingMs > 0) {
        return NextResponse.json(
          {
            status: "too-fresh",
            results: cached.results_json,
            retryAt: new Date(refreshedTime + MIN_REFRESH_AGE_MS).toISOString(),
            message: "Cache is less than one hour old.",
          },
          { status: 429 },
        );
      }
    }

    const section = await getSection(sectionCode);
    const competitionCode = section?.competition_code ?? deriveCompetitionCode(sectionCode);

    const fresh = await fetchSingleSectionResults(competitionCode, sectionCode);

    await upsertSection(
      sectionCode,
      fresh.sections[0]?.sectionName ?? sectionCode,
      competitionCode,
    );
    await saveSectionResults(sectionCode, fresh);

    return NextResponse.json({
      status: "refreshed",
      results: fresh,
      retryAt: new Date(Date.now() + MIN_REFRESH_AGE_MS).toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 502 },
    );
  }
}
