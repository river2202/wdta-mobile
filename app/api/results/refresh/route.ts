/**
 * Legacy refresh endpoint — kept for backward compatibility with any bookmarked URLs.
 * Redirects to the new per-section refresh endpoint.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "deprecated",
      message: "This endpoint is no longer used. Use /api/sections/{sectionCode}/refresh instead.",
    },
    { status: 410 },
  );
}
