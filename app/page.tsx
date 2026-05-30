import { cookies } from "next/headers";

import { ResultsApp } from "@/components/ResultsApp";
import cachedResults from "@/data/wdta-results.json";
import type { CachedResults } from "@/lib/wdta/types";

const results = cachedResults as CachedResults;
const SECTION_COOKIE_NAME = "wdta-mobile-section";

type PageProps = {
  searchParams?: Promise<{
    section?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const rememberedSectionCode = cookieStore.get(SECTION_COOKIE_NAME)?.value;
  const initialSectionCode = params?.section || rememberedSectionCode;

  return <ResultsApp initialResults={results} initialSectionCode={initialSectionCode} />;
}
