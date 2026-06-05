import { NextResponse } from "next/server";

import { getCompetitions, upsertCompetition } from "@/lib/db/queries";
import { fetchCompetitionOptions } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    let competitions = await getCompetitions();

    if (competitions.length === 0) {
      // First-run: discover competitions from TROLS
      const options = await fetchCompetitionOptions();

      for (const opt of options) {
        await upsertCompetition(opt.code, opt.name);
      }

      competitions = await getCompetitions();
    }

    return NextResponse.json(
      competitions.map((c) => ({ code: c.code, name: c.name })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load competitions" },
      { status: 502 },
    );
  }
}
