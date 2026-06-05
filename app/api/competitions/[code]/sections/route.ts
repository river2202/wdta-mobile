import { NextResponse } from "next/server";

import { getSections, upsertCompetition, upsertSection } from "@/lib/db/queries";
import { fetchSectionOptions } from "@/lib/wdta/fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;

  try {
    let sections = await getSections(code);

    if (sections.length === 0) {
      // First-run for this competition: discover sections from TROLS
      const options = await fetchSectionOptions(code);

      if (options.length === 0) {
        return NextResponse.json(
          { error: `No sections found for competition "${code}"` },
          { status: 404 },
        );
      }

      // Ensure competition row exists before inserting sections (FK)
      await upsertCompetition(code, code);

      for (const opt of options) {
        await upsertSection(opt.code, opt.name, code);
      }

      sections = await getSections(code);
    }

    return NextResponse.json(
      sections.map((s) => ({ code: s.code, name: s.name, competitionCode: s.competition_code })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load sections" },
      { status: 502 },
    );
  }
}
