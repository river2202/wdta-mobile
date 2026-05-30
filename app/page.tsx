import { ResultsApp } from "@/components/ResultsApp";
import cachedResults from "@/data/wdta-results.json";
import type { CachedResults } from "@/lib/wdta/types";

const results = cachedResults as CachedResults;

type PageProps = {
  searchParams?: Promise<{
    section?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  return <ResultsApp initialResults={results} initialSectionCode={params?.section} />;
}
