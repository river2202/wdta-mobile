import {
  parseCompetitionName,
  parseLadderEntries,
  parseLaddersLoadedAt,
  parseMatchDetails,
  parseResultsLoadedAt,
  parseSectionOptions,
  parseSectionResults,
} from "./parse";
import type { CachedResults, MatchResult, SectionResults, SectionTarget } from "./types";

export const SOURCE_URL = "https://www.trols.org.au/wdta/results.php";
export const MATCH_POPUP_URL = "https://www.trols.org.au/wdta/match_popup.php";
export const LADDERS_URL = "https://www.trols.org.au/wdta/ladders.php";
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
  let latestLaddersLoadedAt: string | undefined;

  for (const section of resolvedSections) {
    const html = await postResultsPage({
      which: "1",
      style: "",
      daytime: COMPETITION_CODE,
      section: section.code,
    });
    latestResultsLoadedAt = parseResultsLoadedAt(html) ?? latestResultsLoadedAt;
    const sectionResults = parseSectionResults(html, section.code);
    const ladderHtml = await getLadderPage(section.code);
    latestLaddersLoadedAt = parseLaddersLoadedAt(ladderHtml) ?? latestLaddersLoadedAt;
    sectionResults.ladder = parseLadderEntries(ladderHtml, section.code);
    await attachMatchDetails(sectionResults);
    sections.push(sectionResults);
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      url: SOURCE_URL,
      competitionCode: COMPETITION_CODE,
      competitionName: parseCompetitionName(competitionHtml) ?? "Saturday AM",
      resultsLoadedAt: latestResultsLoadedAt,
      laddersLoadedAt: latestLaddersLoadedAt,
    },
    sections,
  };
}

async function attachMatchDetails(section: SectionResults) {
  for (const round of section.rounds) {
    for (const match of round.matches) {
      if (match.status === "played" && match.matchId) {
        match.details = await fetchMatchDetails(match);
      }
    }
  }
}

async function fetchMatchDetails(match: MatchResult) {
  if (!match.matchId) {
    return undefined;
  }

  const url = new URL(MATCH_POPUP_URL);
  url.searchParams.set("matchid", match.matchId);
  url.searchParams.set("seasonid", "");
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `WDTA match detail request failed for ${match.matchId} with ${response.status} ${response.statusText}`,
    );
  }

  return parseMatchDetails(await response.text());
}

async function getLadderPage(sectionCode: string): Promise<string> {
  const url = new URL(LADDERS_URL);
  url.searchParams.set("which", "1");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", COMPETITION_CODE);
  url.searchParams.set("section", sectionCode);
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `WDTA ladder request failed for ${sectionCode} with ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
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
