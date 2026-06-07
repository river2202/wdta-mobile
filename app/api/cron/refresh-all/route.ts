import { NextResponse } from "next/server";

import { countStaleSections, getStaleSections, upsertSectionCache } from "@/lib/db/queries";
import { fetchSingleSectionResults } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Hobby-safe ceiling

// A section is eligible for refresh once its cache is older than this.
const STALE_AFTER_MS = 18 * 60 * 60 * 1000; // 18h
// Max sections to attempt in one run (time budget usually stops us first).
const PER_RUN_CAP = 80;
// Process this many sections in parallel. Each section itself fetches match
// details with DETAIL_CONCURRENCY(=5), so peak TROLS requests ≈ this × 5.
const SECTION_CONCURRENCY = 3;
// Stop starting new sections past this wall-clock budget. Headroom under
// maxDuration(60s) absorbs the in-flight sections still draining (a single
// section can take ~10s+ if its sequential pre-fetches hit the 8s timeout).
const TIME_BUDGET_MS = 45 * 1000;

type RefreshSummary = {
  sectionCode: string;
  status: "ok" | "error";
  error?: string;
};

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel Cron call.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const staleBefore = await countStaleSections(STALE_AFTER_MS);
  const candidates = await getStaleSections(STALE_AFTER_MS, PER_RUN_CAP);

  const results: RefreshSummary[] = [];
  let cursor = 0;
  let stoppedForTime = false;

  async function worker() {
    while (true) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        stoppedForTime = true;
        return;
      }
      const index = cursor++;
      if (index >= candidates.length) return;

      const section = candidates[index];
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
    }
  }

  await Promise.all(Array.from({ length: SECTION_CONCURRENCY }, () => worker()));

  const elapsedMs = Date.now() - startedAt;
  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;
  const attempted = results.length;
  const remaining = Math.max(0, staleBefore - ok);

  console.log(
    `[cron/refresh-all] ${ok} ok, ${failed} failed of ${attempted} attempted ` +
      `(stale before ${staleBefore}, ~${remaining} left) in ${elapsedMs}ms, ` +
      `concurrency ${SECTION_CONCURRENCY}${stoppedForTime ? ", stopped on time budget" : ""}`,
  );

  return NextResponse.json({
    refreshed: ok,
    failed,
    attempted,
    staleBefore,
    remaining,
    stoppedForTime,
    concurrency: SECTION_CONCURRENCY,
    elapsedMs,
    details: results,
    timestamp: new Date().toISOString(),
  });
}
