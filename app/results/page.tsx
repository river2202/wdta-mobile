import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ResultsApp } from "@/components/ResultsApp";
import { SectionLoader } from "@/components/SectionLoader";
import { getSectionCache } from "@/lib/db/queries";

const SECTION_COOKIE_NAME = "wdta-mobile-section";

type PageProps = {
  searchParams?: Promise<{ section?: string }>;
};

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sectionCode = params?.section || cookieStore.get(SECTION_COOKIE_NAME)?.value;

  if (!sectionCode) {
    redirect("/");
  }

  // Read-only DB lookup — never fetch from TROLS during render (that work is
  // done by the cron and the on-demand API route, so the page can't time out).
  let cached;
  try {
    cached = await getSectionCache(sectionCode);
  } catch (error) {
    console.error(`[results] DB read failed for ${sectionCode}:`, error);
    cached = null;
  }

  // Serve whatever we have (fresh or stale). ResultsApp refreshes in the
  // background when the cache is older than 2h.
  if (cached) {
    return <ResultsApp initialResults={cached.results_json} sectionCode={sectionCode} />;
  }

  // No cache yet — let the client fetch it on demand (with a spinner and
  // retry/back options), so the first visit doesn't block page render.
  return <SectionLoader sectionCode={sectionCode} />;
}
