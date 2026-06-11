import {
  getPlayerAppearances,
  getSectionCache,
  type PlayerAppearanceDbRow,
} from "@/lib/db/queries";
import { normalizePlayerKey } from "@/lib/wdta/appearances";
import type { MatchDetails, MatchResult } from "@/lib/wdta/types";
import {
  PlayerProfile,
  type PlayerMatch,
  type PlayerTeamGroup,
} from "@/components/PlayerProfile";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ name: string }> };

export default async function PlayerPage({ params }: PageProps) {
  const { name } = await params;
  const decoded = safeDecode(name);
  const key = normalizePlayerKey(decoded);

  let rows: PlayerAppearanceDbRow[] = [];
  try {
    rows = await getPlayerAppearances(key);
  } catch (error) {
    console.error(`[player] DB read failed for ${key}:`, error);
  }

  const displayName = rows[0]?.player_label || decoded;
  const matchDetails = await loadMatchDetails(rows);
  const teamGroups = buildTeamGroups(rows, matchDetails);
  const backHref = teamGroups[0]?.sectionCode
    ? `/results?section=${encodeURIComponent(teamGroups[0].sectionCode)}`
    : "/";

  return (
    <PlayerProfile name={displayName} teamGroups={teamGroups} backHref={backHref} highlightKey={key} />
  );
}

/** Load cached match results for the player's sections, keyed by matchId. */
async function loadMatchDetails(rows: PlayerAppearanceDbRow[]): Promise<Map<string, MatchDetails>> {
  const sectionCodes = [...new Set(rows.map((r) => r.section_code))];
  const map = new Map<string, MatchDetails>();

  await Promise.all(
    sectionCodes.map(async (code) => {
      try {
        const cached = await getSectionCache(code);
        if (!cached) return;
        for (const section of cached.results_json.sections) {
          for (const round of section.rounds) {
            for (const match of round.matches as MatchResult[]) {
              if (match.matchId && match.details) map.set(match.matchId, match.details);
            }
          }
        }
      } catch (error) {
        console.error(`[player] failed to load section ${code}:`, error);
      }
    }),
  );

  return map;
}

function buildTeamGroups(
  rows: PlayerAppearanceDbRow[],
  matchDetails: Map<string, MatchDetails>,
): PlayerTeamGroup[] {
  const groups = new Map<string, PlayerTeamGroup & { _allEmergency: boolean }>();

  for (const r of rows) {
    const id = `${r.team}|${r.section_code}`;
    let group = groups.get(id);
    if (!group) {
      group = {
        team: r.team,
        sectionName: r.section_name,
        sectionCode: r.section_code,
        emergencyOnly: r.emergency,
        matches: [],
        _allEmergency: r.emergency,
      };
      groups.set(id, group);
    }
    group._allEmergency = group._allEmergency && r.emergency;
    group.matches.push({
      matchDate: r.match_date,
      round: r.round,
      opponent: r.opponent,
      teamPoints: r.team_points,
      oppPoints: r.opp_points,
      result: resultOf(r.team_points, r.opp_points),
      emergency: r.emergency,
      position: r.position,
      detail: matchDetails.get(r.match_id) ?? null,
    });
  }

  return [...groups.values()]
    .map(({ _allEmergency, ...g }) => ({
      ...g,
      emergencyOnly: _allEmergency,
      matches: g.matches.sort((a, b) => sortKey(b) - sortKey(a)),
    }))
    .sort((a, b) => b.matches.length - a.matches.length);
}

function resultOf(team: number | null, opp: number | null): "win" | "loss" | "draw" | null {
  if (team == null || opp == null) return null;
  if (team > opp) return "win";
  if (team < opp) return "loss";
  return "draw";
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function sortKey(m: PlayerMatch): number {
  return parseMatchDate(m.matchDate) ?? m.round;
}

function parseMatchDate(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const monthIdx = MONTHS.indexOf(match[2].toLowerCase());
  let year = Number.parseInt(match[3], 10);
  if (monthIdx < 0) return null;
  if (year < 100) year += 2000;
  return new Date(year, monthIdx, day).getTime();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
