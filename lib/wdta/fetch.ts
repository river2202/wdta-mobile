import {
  parseCompetitionName,
  parseResultsLoadedAt,
  parseSectionOptions,
  parseSectionResults,
} from "./parse";
import type { CachedResults, SectionTarget } from "./types";

export const SOURCE_URL = "https://www.trols.org.au/wdta/results.php";
export const COMPETITION_CODE = "AA";
export const TARGET_SECTIONS: SectionTarget[] = [
  { label: "Girls S/D Rubbers Section 1", fallbackCode: "AA016" },
  { label: "Girls S/D Rubbers Section 2", fallbackCode: "AA017" },
];

const REQUEST_HEADERS = {
  "content-type": "application/x-www-form-urlencoded",
  "user-agent": "wdta-mobile-results/0.1 daily-cache contact:github-actions",
};

export async function fetchCachedResults(): Promise<CachedResults> {
  const competitionHtml = await postResultsPage({
    which: "0",
    style: "",
    daytime: COMPETITION_CODE,
  });
  const options = parseSectionOptions(competitionHtml);
  const resolvedSections = TARGET_SECTIONS.map((target) => {
    const option = options.find((candidate) => candidate.label === target.label);
    return {
      label: target.label,
      code: option?.code ?? target.fallbackCode,
    };
  });

  const sections = [];
  let latestResultsLoadedAt = parseResultsLoadedAt(competitionHtml);

  for (const section of resolvedSections) {
    const html = await postResultsPage({
      which: "1",
      style: "",
      daytime: COMPETITION_CODE,
      section: section.code,
    });
    latestResultsLoadedAt = parseResultsLoadedAt(html) ?? latestResultsLoadedAt;
    sections.push(parseSectionResults(html, section.code));
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      url: SOURCE_URL,
      competitionCode: COMPETITION_CODE,
      competitionName: parseCompetitionName(competitionHtml) ?? "Saturday AM",
      resultsLoadedAt: latestResultsLoadedAt,
    },
    sections,
  };
}

async function postResultsPage(fields: Record<string, string>): Promise<string> {
  const body = new URLSearchParams(fields);
  const response = await fetch(SOURCE_URL, {
    method: "POST",
    headers: REQUEST_HEADERS,
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WDTA request failed with ${response.status} ${response.statusText}`);
  }

  return response.text();
}

