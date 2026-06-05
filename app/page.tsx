import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/LandingPage";
import { getCompetitions, getSections } from "@/lib/db/queries";
import { fetchCompetitionOptions, fetchSectionOptions } from "@/lib/wdta/fetch";
import { upsertCompetition, upsertSection } from "@/lib/db/queries";
import type { CompetitionOption, SectionOption } from "@/components/LandingPage";

const SECTION_COOKIE_NAME = "wdta-mobile-section";

type PageProps = {
  searchParams?: Promise<{ change?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const savedSection = cookieStore.get(SECTION_COOKIE_NAME)?.value;

  // ?change=1 → user clicked "Change section", show selector instead of auto-redirect
  const wantsChange = params?.change === "1";

  // If the user has a saved section and isn't changing it, skip the landing page
  if (savedSection && !wantsChange) {
    redirect(`/results?section=${encodeURIComponent(savedSection)}`);
  }

  // Load competition + section options from DB (bootstrap from TROLS if empty)
  const competitions = await loadCompetitions();
  const sections = await loadAllSections(competitions.map((c) => c.code));

  return <LandingPage competitions={competitions} sections={sections} />;
}

async function loadCompetitions(): Promise<CompetitionOption[]> {
  try {
    let rows = await getCompetitions();

    if (rows.length === 0) {
      const options = await fetchCompetitionOptions();
      for (const opt of options) {
        await upsertCompetition(opt.code, opt.name);
      }
      rows = await getCompetitions();
    }

    return rows.map((r) => ({ code: r.code, name: r.name }));
  } catch {
    // DB not yet connected (local dev without DB) — return a placeholder
    return [{ code: "AA", name: "Saturday AM" }];
  }
}

async function loadAllSections(competitionCodes: string[]): Promise<SectionOption[]> {
  const allSections: SectionOption[] = [];

  for (const competitionCode of competitionCodes) {
    try {
      let rows = await getSections(competitionCode);

      if (rows.length === 0) {
        const options = await fetchSectionOptions(competitionCode);
        for (const opt of options) {
          await upsertSection(opt.code, opt.name, competitionCode);
        }
        rows = await getSections(competitionCode);
      }

      allSections.push(
        ...rows.map((r) => ({
          code: r.code,
          name: r.name,
          competitionCode: r.competition_code,
        })),
      );
    } catch {
      // Skip competitions that fail to load sections
    }
  }

  return allSections;
}
