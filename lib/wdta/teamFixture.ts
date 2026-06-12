import * as cheerio from "cheerio";

import { cleanText, parseCompetitionName } from "./parse";

export type VenueInfo = {
  team: string;
  melway?: string;
  lat?: number;
  lng?: number;
  addressLines: string[];
  clubPhone?: string;
  contactName?: string;
  contactPhone?: string;
};

export type FixtureRound = {
  /** Absent for "No Play" weeks. */
  round?: number;
  date: string; // e.g. "2 May 26"
  home: string;
  away: string;
  noPlay?: boolean;
};

export type FinalsDate = { label: string; date: string };

export type TeamFixtureData = {
  teamName: string;
  sectionName: string;
  competitionName?: string;
  venues: VenueInfo[];
  rounds: FixtureRound[];
  finals: FinalsDate[];
};

/** Parse the TROLS fixture.php team page (which=2): venues + full-season fixture. */
export function parseTeamFixturePage(html: string): TeamFixtureData {
  const $ = cheerio.load(html);

  // Tables are nested; the heading td also exists inside container tds whose
  // text starts the same way — the shortest matching text is the real heading.
  const fixtureHeading = $("td")
    .toArray()
    .map((el) => cleanText($(el).text()))
    .filter((text) => text.startsWith("Fixture for "))
    .sort((a, b) => a.length - b.length)[0];
  const teamName = fixtureHeading ? fixtureHeading.replace(/^Fixture for\s*/, "") : "";

  const sectionName =
    cleanText($("#section option[selected]").first().text()) ||
    $("td.mg")
      .toArray()
      .map((el) => cleanText($(el).text()))
      .find(
        (text) =>
          text && !text.startsWith("Fixture for") && !/^section information$/i.test(text),
      ) ||
    "";

  const venues = parseVenues($);
  const { rounds, finals } = parseFixtureRounds($);

  if (!teamName || rounds.length === 0) {
    throw new Error("Could not parse team fixture page");
  }

  return {
    teamName,
    sectionName,
    competitionName: parseCompetitionName(html),
    venues,
    rounds,
    finals,
  };
}

/** Innermost table containing the marker text (tables are nested on this page). */
function innermostTable($: cheerio.CheerioAPI, marker: string) {
  return $("table")
    .toArray()
    .map((el) => $(el))
    .filter((t) => t.text().includes(marker))
    .sort((a, b) => a.text().length - b.text().length)[0];
}

const DATE_RE = /\d{1,2}\s+[A-Za-z]{3}\s+\d{2}/;

function parseVenues($: cheerio.CheerioAPI): VenueInfo[] {
  const table = innermostTable($, "Section Information");
  if (!table) return [];

  const venues: VenueInfo[] = [];
  let current: VenueInfo | null = null;

  for (const row of table.find("tr").toArray()) {
    const cells = $(row).find("td").toArray();
    if (cells.length === 0) continue;
    const first = cleanText($(cells[0]).text());
    const second = cells[1] ? cleanText($(cells[1]).text()) : "";

    // New entry: "<n> | <team> | Melway"
    if (/^\d+$/.test(first) && cells.length >= 2 && !DATE_RE.test(second)) {
      if (current) venues.push(current);
      current = null;
      if (!second || /^bye$/i.test(second)) continue; // Bye placeholder
      current = { team: second, addressLines: [] };

      const link = cells[2] ? $(cells[2]).find("a").first() : null;
      if (link && link.length) {
        current.melway = cleanText(link.text()) || undefined;
        const onclick = link.attr("onclick") ?? "";
        const coords = onclick.match(/pop_map\(.*?,\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/);
        if (coords) {
          current.lat = Number.parseFloat(coords[1]);
          current.lng = Number.parseFloat(coords[2]);
        }
      }
      continue;
    }

    if (!current) continue;

    // Address block: empty first cell + colspan cell with <br>-separated lines.
    if (first === "" && cells[1] && $(cells[1]).attr("colspan")) {
      const lines = ($(cells[1]).html() ?? "")
        .split(/<br\s*\/?>/i)
        .map((part) => cleanText(part.replace(/<[^>]+>/g, "")))
        .filter(Boolean);
      for (const line of lines) {
        const phone = line.match(/club house ph:?\s*(.+)/i);
        if (phone) current.clubPhone = phone[1].trim();
        else current.addressLines.push(line);
      }
      continue;
    }

    // Contact row: "Club Contact:Name" | "Mob: xxxx" (cell may hold "Ph: …Mob: …")
    if (second.toLowerCase().startsWith("club contact")) {
      current.contactName = second.replace(/^club contact:?\s*/i, "").trim() || undefined;
      const third = cells[2] ? cleanText($(cells[2]).text()) : "";
      const phones = [...new Set(third.match(/\d[\d ]{6,}\d/g) ?? [])];
      if (phones.length > 0) current.contactPhone = phones.join(" / ");
      continue;
    }
  }
  if (current) venues.push(current);

  return venues;
}

function parseFixtureRounds($: cheerio.CheerioAPI): {
  rounds: FixtureRound[];
  finals: FinalsDate[];
} {
  const table = innermostTable($, "Fixture for ");
  if (!table) return { rounds: [], finals: [] };

  const rounds: FixtureRound[] = [];

  for (const row of table.find("tr").toArray()) {
    const cells = $(row).find("td").toArray();
    if (cells.length < 2) continue;

    const rd = cleanText($(cells[0]).text());
    const date = cleanText($(cells[1]).text());
    if (!/\d{1,2}\s+[A-Za-z]{3}\s+\d{2}/.test(date)) continue;

    const rowText = cleanText($(row).text());
    if (/no play/i.test(rowText)) {
      rounds.push({ date, home: "", away: "", noPlay: true });
      continue;
    }
    if (cells.length < 4) continue;

    const home = cleanText($(cells[2]).text());
    const away = cleanText($(cells[3]).text());
    if (!home && !away) continue;

    rounds.push({
      round: /^\d+$/.test(rd) ? Number.parseInt(rd, 10) : undefined,
      date,
      home,
      away,
    });
  }

  // Finals dates, e.g. "Prelim Final - 29 Aug 26   Grand Final - 5 Sep 26".
  // Cell texts concatenate without separators, so match known finals names only.
  const finals: FinalsDate[] = [];
  const tail = cleanText(table.text());
  const finalsRe =
    /(Grand Final|Semi Final|Prelim(?:inary)? Final|Qualifying Final|Elimination Final)\s*-\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2})/g;
  for (const m of tail.matchAll(finalsRe)) {
    finals.push({ label: m[1], date: m[2] });
  }

  return { rounds, finals };
}
