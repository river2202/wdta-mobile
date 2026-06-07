import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ResultsApp } from "@/components/ResultsApp";
import { SectionLoadError } from "@/components/SectionLoadError";
import { getSectionCache, getSection, upsertSection, upsertSectionCache } from "@/lib/db/queries";
import { deriveCompetitionCode, fetchSingleSectionResults } from "@/lib/wdta/fetch";
import type { CachedResults } from "@/lib/wdta/types";

const SECTION_COOKIE_NAME = "wdta-mobile-section";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type PageProps = {
  searchParams?: Promise<{ section?: string }>;
};

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sectionCode =
    params?.section || cookieStore.get(SECTION_COOKIE_NAME)?.value;

  if (!sectionCode) {
    redirect("/");
  }

  const results = await loadResults(sectionCode);

  if (!results) {
    // Do NOT redirect to "/" here: the home page would redirect straight back
    // (cookie is still set), causing an infinite reload loop. Instead render a
    // recovery screen that clears the saved selection.
    return <SectionLoadError />;
  }

  return <ResultsApp initialResults={results} sectionCode={sectionCode} />;
}

async function loadResults(sectionCode: string): Promise<CachedResults | null> {
  let staleCache: CachedResults | null = null;

  try {
    const cached = await getSectionCache(sectionCode);
    const now = Date.now();
    const generatedTime = cached ? Date.parse(cached.generated_at) : NaN;
    const isFresh = !Number.isNaN(generatedTime) && now - generatedTime < CACHE_MAX_AGE_MS;

    if (cached) {
      staleCache = cached.results_json;
      if (isFresh) {
        return cached.results_json;
      }
    }

    // Stale or missing — fetch from TROLS
    const section = await getSection(sectionCode);
    const competitionCode = section?.competition_code ?? deriveCompetitionCode(sectionCode);

    const fresh = await fetchSingleSectionResults(competitionCode, sectionCode);

    // Update indexes
    await upsertSection(
      sectionCode,
      fresh.sections[0]?.sectionName ?? sectionCode,
      competitionCode,
    );
    await upsertSectionCache(sectionCode, fresh);

    return fresh;
  } catch (error) {
    console.error(`[results] Failed to load ${sectionCode}:`, error);
    // Serve stale data rather than showing an error, if we have any cached copy.
    return staleCache;
  }
}
