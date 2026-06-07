import { NextResponse } from "next/server";

import { getStaleSections, upsertSectionCache } from "@/lib/db/queries";
import { fetchSingleSectionResults } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Hobby-safe ceiling

// How stale a section must be before the cron will refresh it again.
const STALE_AFTER_MS = 12 * 60 * 60 * 1000; // 12h
// Max sections to attempt in one run (the rest roll over to the next run).
const BATCH_SIZE = 6;
// Pause between sections so we don't hammer / get rate-limited by TROLS.
const STAGGER_MS = 1500;
// Stop starting new sections past this wall-clock budget, leaving headroom
// under maxDuration so the function returns cleanly.
const TIME_BUDGET_MS = 50 * 1000;

type RefreshSummary = {
  sectionCode: string;
  status: "ok" | "error";
  error?: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const candidates = await getStaleSections(STALE_AFTER_MS, BATCH_SIZE);
  const results: RefreshSummary[] = [];
  let skippedForTime = 0;

  for (let i = 0; i < candidates.length; i++) {
    const section = candidates[i];

    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      skippedForTime = candidates.length - i;
      break;
    }

    try {
      const fresh = await fetchSingleSectionResults(section.competition_code, section.code);
      await upsertSectionCache(section.code, fresh);
      results.push({ sectionCode: section.code, status: "ok" });
    } catch (error) {
      results.push({
        sectionCode: section.code,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Stagger between sections (skip the wait after the last one).
    if (i < candidates.length - 1) {
      await delay(STAGGER_MS);
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(
    `[cron/refresh-all] ${ok} ok, ${failed} failed, ${skippedForTime} deferred ` +
      `(batch ${candidates.length}) in ${Date.now() - startedAt}ms`,
  );

  return NextResponse.json({
    refreshed: ok,
    failed,
    deferred: skippedForTime,
    batchSize: candidates.length,
    details: results,
    timestamp: new Date().toISOString(),
  });
}
