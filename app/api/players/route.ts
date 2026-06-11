import { NextResponse } from "next/server";

import { searchPlayers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";

  if (q.trim().length === 0) {
    return NextResponse.json([]);
  }

  try {
    const players = await searchPlayers(q);
    return NextResponse.json(players);
  } catch (error) {
    console.error("[players/search] failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
