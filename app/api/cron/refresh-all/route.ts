import { NextResponse } from "next/server";

import { getAllSections, upsertSectionCache } from "@/lib/db/queries";
import { fetchSingleSectionResults } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro allows up to 5 minutes for cron routes

type RefreshSummary = {
  sectionCode: string;
  status: "ok" | "error";
  error?: string;
};

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await getAllSections();
  const results: RefreshSummary[] = [];

  for (const section of sections) {
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

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;

  console.log(`[cron/refresh-all] ${ok} ok, ${failed} failed out of ${sections.length} sections`);

  return NextResponse.json({
    refreshed: ok,
    failed,
    total: sections.length,
    details: results,
    timestamp: new Date().toISOString(),
  });
}
