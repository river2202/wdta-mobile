import { NextResponse } from "next/server";

import cachedResults from "@/data/wdta-results.json";
import { fetchCachedResults } from "@/lib/wdta/fetch";
import type { CachedResults } from "@/lib/wdta/types";

const MIN_REFRESH_AGE_MS = 60 * 60 * 1000;
const seededResults = cachedResults as CachedResults;

let runtimeCache: CachedResults | undefined;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const currentResults = runtimeCache ?? seededResults;
  const generatedTime = Date.parse(currentResults.generatedAt);
  const now = Date.now();

  if (!Number.isNaN(generatedTime)) {
    const retryAtTime = generatedTime + MIN_REFRESH_AGE_MS;

    if (now < retryAtTime) {
      return NextResponse.json(
        {
          status: "too-fresh",
          results: currentResults,
          retryAt: new Date(retryAtTime).toISOString(),
          message: "Cache is less than one hour old.",
        },
        { status: 429 },
      );
    }
  }

  try {
    const freshResults = await fetchCachedResults();
    runtimeCache = freshResults;

    return NextResponse.json({
      status: "refreshed",
      results: freshResults,
      retryAt: new Date(Date.parse(freshResults.generatedAt) + MIN_REFRESH_AGE_MS).toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        results: currentResults,
        message: error instanceof Error ? error.message : "Refresh failed.",
      },
      { status: 502 },
    );
  }
}
