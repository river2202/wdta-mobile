import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import type {
  LadderEntry,
  MatchDetails,
  MatchPlayer,
  MatchResult,
  RoundResult,
  RubberDetail,
  SectionResults,
  TeamScore,
} from "./types";

export type SectionOption = {
  code: string;
  label: string;
};

export function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function parseCompetitionName(html: string): string | undefined {
  const $ = cheerio.load(html);
  const selected = cleanText($("#daytime option[selected]").first().text());
  return selected || undefined;
}

export function parseResultsLoadedAt(html: string): string | undefined {
  const $ = cheerio.load(html);
  const text = $("span")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .find((value) => value.includes("Results Loaded:"));

  return text?.replace(/^Results Loaded:\s*/i, "") || undefined;
}

export function parseLaddersLoadedAt(html: string): string | undefined {
  const $ = cheerio.load(html);
  const text = $("span")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .find((value) => value.includes("Ladders Loaded:"));

  return text?.replace(/^Ladders Loaded:\s*/i, "") || undefined;
}

export function parseSectionOptions(html: string): SectionOption[] {
  const $ = cheerio.load(html);

  return $("#section option")
    .toArray()
    .map((element) => ({
      code: String($(element).attr("value") ?? ""),
      label: cleanText($(element).text()),
    }))
    .filter((option) => option.code && option.label);
}

export type CompetitionOption = {
  code: string;
  label: string;
};

export function parseCompetitionOptions(html: string): CompetitionOption[] {
  const $ = cheerio.load(html);

  return $("#daytime option")
    .toArray()
    .map((element) => ({
      code: String($(element).attr("value") ?? ""),
      label: cleanText($(element).text()),
    }))
    .filter((option) => option.code && option.label);
}

export function parseSectionResults(
  html: string,
  sectionCode: string,
): SectionResults {
  const $ = cheerio.load(html);
  const sectionName =
    cleanText($("span.mg a").first().text()) ||
    cleanText($("#section option[selected]").first().text()) ||
    sectionCode;

  const resultTable = $("table[align='center']")
    .toArray()
    .map((element) => $(element))
    .find((table) => table.find("td.sb").length > 0 && table.text().includes("Home Team"));

  if (!resultTable) {
    throw new Error(`Could not find result table for ${sectionCode}`);
  }

  const rounds: RoundResult[] = [];
  let currentRound: RoundResult | undefined;

  for (const row of resultTable.find("tr").toArray()) {
    const $row = $(row);
    const roundHeader = $row.find("td.sb").first();

    if (roundHeader.length > 0) {
      currentRound = parseRoundHeader(cleanText(roundHeader.text()));
      if (currentRound) {
        rounds.push(currentRound);
      }
      continue;
    }

    if (!currentRound || $row.find("th").length > 0) {
      continue;
    }

    const cells = $row.find("td").toArray();
    if (cells.length === 0 || cleanText($row.text()) === "") {
      continue;
    }

    const match = parseMatchRow($, cells);
    if (match) {
      currentRound.matches.push(match);
    }
  }

  if (rounds.length === 0) {
    throw new Error(`No rounds parsed for ${sectionCode}`);
  }

  return {
    sectionCode,
    sectionName,
    rounds,
  };
}

export function parseMatchDetails(html: string): MatchDetails {
  const $ = cheerio.load(html);
  const heading = cleanText($("td.mb").first().text()) || undefined;
  const detailTable = $("body > table").eq(1);

  if (detailTable.length === 0) {
    throw new Error("Could not find match detail table");
  }

  const teamNames = detailTable
    .find("tr")
    .first()
    .find("b")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);
  const nestedTables = detailTable.find("table").toArray();

  if (teamNames.length < 2 || nestedTables.length < 3) {
    throw new Error("Could not parse match detail teams");
  }

  return {
    heading,
    homeTeam: teamNames[0],
    awayTeam: teamNames[1],
    homePlayers: parsePlayerTable($, nestedTables[0]),
    awayPlayers: parsePlayerTable($, nestedTables[2]),
    rubbers: parseRubberTable($, nestedTables[1]),
  };
}

export function parseLadderEntries(html: string, sectionCode: string): LadderEntry[] {
  const $ = cheerio.load(html);
  const ladderTable = $("table")
    .toArray()
    .map((element) => $(element))
    .find((table) => table.find(`a[href*="section=${sectionCode}"]`).length > 0);

  if (!ladderTable) {
    throw new Error(`Could not find ladder table for ${sectionCode}`);
  }

  const rows = ladderTable.find("tr").toArray().slice(1);
  const entries: LadderEntry[] = [];

  for (const row of rows) {
    const cells = $(row).find("td").toArray();
    const rowText = cleanText($(row).text());

    if (cells.length < 3 || rowText === "") {
      continue;
    }

    const teamInfo = parseTeamCell($, cells[0]);
    const points = Number.parseFloat(cleanText($(cells[1]).text()));
    const percentage = Number.parseFloat(cleanText($(cells[2]).text()));

    if (!teamInfo.team || Number.isNaN(points) || Number.isNaN(percentage)) {
      continue;
    }

    entries.push({
      rank: entries.length + 1,
      team: teamInfo.team,
      points,
      percentage,
      venueNote: teamInfo.venueNote,
      finalsCut: $(cells[0]).hasClass("separate"),
    });
  }

  if (entries.length === 0) {
    throw new Error(`No ladder entries parsed for ${sectionCode}`);
  }

  return entries;
}

function parseRoundHeader(text: string): RoundResult | undefined {
  const match = text.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{2}).*?Rd\.?\s*(\d+)/i);
  if (!match) {
    return undefined;
  }

  return {
    date: match[1],
    round: Number.parseInt(match[2], 10),
    matches: [],
  };
}

function parseMatchRow(
  $: cheerio.CheerioAPI,
  cells: AnyNode[],
): MatchResult | undefined {
  if (cells.length >= 11) {
    const homeCell = cells[0];
    const awayCell = cells[10];
    const homeInfo = parseTeamCell($, homeCell);
    const awayInfo = parseTeamCell($, awayCell);
    const home = parseTeamScore($, cells, 1);
    const away = parseTeamScore($, cells, 6);

    if (home && away && homeInfo.team && awayInfo.team) {
      return {
        matchId: parseMatchId($, homeCell),
        status: "played",
        homeTeam: homeInfo.team,
        awayTeam: awayInfo.team,
        venueNote: homeInfo.venueNote,
        home,
        away,
      };
    }
  }

  return parseStatusRow($, cells);
}

function parseStatusRow(
  $: cheerio.CheerioAPI,
  cells: AnyNode[],
): MatchResult | undefined {
  if (cells.length < 2) {
    return undefined;
  }

  const homeInfo = parseTeamCell($, cells[0]);
  const awayInfo = parseTeamCell($, cells[cells.length - 1]);
  const middleText = cleanText(
    cells
      .slice(1, -1)
      .map((cell) => $(cell).text())
      .join(" "),
  );
  const rowText = cleanText(cells.map((cell) => $(cell).text()).join(" "));

  const status = /wash out/i.test(rowText)
    ? "washout"
    : /forfeited by/i.test(rowText)
      ? "forfeit"
      : /\bbye\b/i.test(rowText)
        ? "bye"
        : middleText
          ? "unknown"
          : undefined;

  if (!status || (!homeInfo.team && !awayInfo.team)) {
    return undefined;
  }

  return {
    status,
    homeTeam: homeInfo.team,
    awayTeam: awayInfo.team,
    venueNote: homeInfo.venueNote,
  };
}

function parseTeamCell($: cheerio.CheerioAPI, cell: AnyNode) {
  const clone = $(cell).clone();
  const venueNote = cleanText(clone.find("div").first().text());
  clone.find("div").remove();

  return {
    team: cleanText(clone.text()),
    venueNote: venueNote || undefined,
  };
}

function parseMatchId($: cheerio.CheerioAPI, cell: AnyNode): string | undefined {
  const onclick = $(cell).find("a").first().attr("onclick") ?? "";
  return onclick.match(/open_match\(event,'[^']*','([^']+)'/)?.[1];
}

function parseTeamScore(
  $: cheerio.CheerioAPI,
  cells: AnyNode[],
  startIndex: number,
): TeamScore | undefined {
  const values = cells
    .slice(startIndex, startIndex + 4)
    .map((cell) => Number.parseFloat(cleanText($(cell).text())));

  if (values.some((value) => Number.isNaN(value))) {
    return undefined;
  }

  return {
    points: values[0],
    rubbers: values[1],
    sets: values[2],
    games: values[3],
  };
}

function parsePlayerTable($: cheerio.CheerioAPI, table: AnyNode): MatchPlayer[] {
  return $(table)
    .find("tr")
    .toArray()
    .map((row) => {
      const cells = $(row).find("td").toArray();
      const marker = cleanText($(cells[0]).text());
      const playerText = cleanText($(cells[1]).text());
      const match = playerText.match(/^([^.\s]+)\.\s*(.+)$/);

      return {
        position: match?.[1] ?? "",
        name: match?.[2] ?? playerText,
        emergency: marker === "E",
      };
    })
    .filter((player) => player.name);
}

function parseRubberTable($: cheerio.CheerioAPI, table: AnyNode): RubberDetail[] {
  return $(table)
    .find("tr")
    .toArray()
    .filter((row) => $(row).find(".separate").length === 0)
    .map((row) => {
      const cells = $(row).find("td").toArray();

      return {
        homePosition: cleanText($(cells[0]).text()),
        scoreLines: parseScoreLines($, cells[1]),
        awayPosition: cleanText($(cells[2]).text()),
      };
    })
    .filter((rubber) => rubber.homePosition || rubber.awayPosition || rubber.scoreLines.length);
}

function parseScoreLines($: cheerio.CheerioAPI, cell: AnyNode | undefined): string[] {
  if (!cell) {
    return [];
  }

  const html = $(cell).html() ?? "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map(cleanText)
    .filter(Boolean);
}
