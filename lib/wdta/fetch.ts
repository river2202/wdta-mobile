import {
  parseCompetitionName,
  parseCompetitionOptions,
  parseLadderEntries,
  parseLaddersLoadedAt,
  parseMatchDetails,
  parseResultsLoadedAt,
  parseSectionOptions,
  parseSectionResults,
} from "./parse";
import type { CachedResults, MatchResult, SectionResults } from "./types";

export const SOURCE_URL = "https://www.trols.org.au/wdta/results.php";
export const MATCH_POPUP_URL = "https://www.trols.org.au/wdta/match_popup.php";
export const LADDERS_URL = "https://www.trols.org.au/wdta/ladders.php";

const REQUEST_HEADERS = {
  "content-type": "application/x-www-form-urlencoded",
  "user-agent": "wdta-mobile-results/0.1 daily-cache contact:github-actions",
};

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/** Fetch the list of competitions (daytime options) from the TROLS landing page. */
export async function fetchCompetitionOptions(): Promise<Array<{ code: string; name: string }>> {
  const html = await getResultsPage();
  return parseCompetitionOptions(html).map((opt) => ({ code: opt.code, name: opt.label }));
}

/** Fetch all section options for a given competition code. */
export async function fetchSectionOptions(
  competitionCode: string,
): Promise<Array<{ code: string; name: string }>> {
  const html = await postResultsPage({ which: "0", style: "", daytime: competitionCode });
  return parseSectionOptions(html).map((opt) => ({ code: opt.code, name: opt.label }));
}

// ---------------------------------------------------------------------------
// Single-section results
// ---------------------------------------------------------------------------

/**
 * Fetch full results (rounds, ladder, match details) for a single section.
 * Returns a CachedResults with exactly one entry in sections[].
 */
export async function fetchSingleSectionResults(
  competitionCode: string,
  sectionCode: string,
): Promise<CachedResults> {
  // Competition metadata (name, resultsLoadedAt)
  const competitionHtml = await postResultsPage({
    which: "0",
    style: "",
    daytime: competitionCode,
  });
  const competitionName = parseCompetitionName(competitionHtml);
  let latestResultsLoadedAt = parseResultsLoadedAt(competitionHtml);

  // Section results
  const sectionHtml = await postResultsPage({
    which: "1",
    style: "",
    daytime: competitionCode,
    section: sectionCode,
  });
  latestResultsLoadedAt = parseResultsLoadedAt(sectionHtml) ?? latestResultsLoadedAt;
  const sectionResults = parseSectionResults(sectionHtml, sectionCode);

  // Ladder
  const ladderHtml = await getLadderPage(sectionCode);
  const laddersLoadedAt = parseLaddersLoadedAt(ladderHtml);
  sectionResults.ladder = parseLadderEntries(ladderHtml, sectionCode);

  // Match details (the slow part)
  await attachMatchDetails(sectionResults);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      url: SOURCE_URL,
      competitionCode,
      competitionName: competitionName ?? competitionCode,
      resultsLoadedAt: latestResultsLoadedAt,
      laddersLoadedAt,
    },
    sections: [sectionResults],
  };
}

/**
 * Derive competition code from section code as a last-resort fallback.
 * TROLS codes look like "AA016" where "AA" is the competition prefix.
 * This is a heuristic and may not always be correct.
 */
export function deriveCompetitionCode(sectionCode: string): string {
  return sectionCode.replace(/\d+$/, "") || sectionCode;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
  url.searchParams.set("daytime", deriveCompetitionCode(sectionCode));
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

async function getResultsPage(): Promise<string> {
  const response = await fetch(SOURCE_URL, {
    headers: { "user-agent": REQUEST_HEADERS["user-agent"] },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WDTA landing page request failed with ${response.status} ${response.statusText}`);
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
