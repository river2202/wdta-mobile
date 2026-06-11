import { getPlayerAppearances, type PlayerAppearanceDbRow } from "@/lib/db/queries";
import { normalizePlayerKey } from "@/lib/wdta/appearances";
import { PlayerProfile, type PlayerMatch, type PlayerTeam } from "@/components/PlayerProfile";

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

  const matches: PlayerMatch[] = rows
    .map((r) => ({
      matchDate: r.match_date,
      round: r.round,
      sectionName: r.section_name,
      sectionCode: r.section_code,
      team: r.team,
      opponent: r.opponent,
      teamPoints: r.team_points,
      oppPoints: r.opp_points,
      result: resultOf(r.team_points, r.opp_points),
      emergency: r.emergency,
      position: r.position,
    }))
    .sort((a, b) => sortKey(b) - sortKey(a));

  const teams = aggregateTeams(rows);
  const backHref = teams[0]?.sectionCode
    ? `/results?section=${encodeURIComponent(teams[0].sectionCode)}`
    : "/";

  return <PlayerProfile name={displayName} teams={teams} matches={matches} backHref={backHref} />;
}

function aggregateTeams(rows: PlayerAppearanceDbRow[]): PlayerTeam[] {
  const map = new Map<string, PlayerTeam & { _allEmergency: boolean }>();
  for (const r of rows) {
    const id = `${r.team}|${r.section_code}`;
    const existing = map.get(id);
    if (existing) {
      existing.count += 1;
      existing._allEmergency = existing._allEmergency && r.emergency;
    } else {
      map.set(id, {
        team: r.team,
        sectionName: r.section_name,
        sectionCode: r.section_code,
        count: 1,
        emergencyOnly: r.emergency,
        _allEmergency: r.emergency,
      });
    }
  }
  return [...map.values()]
    .map(({ _allEmergency, ...t }) => ({ ...t, emergencyOnly: _allEmergency }))
    .sort((a, b) => b.count - a.count);
}

function resultOf(team: number | null, opp: number | null): "win" | "loss" | "draw" | null {
  if (team == null || opp == null) return null;
  if (team > opp) return "win";
  if (team < opp) return "loss";
  return "draw";
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Sort key from "23 May 26" → epoch-ish; falls back to round for ties/missing. */
function sortKey(m: PlayerMatch): number {
  const parsed = parseMatchDate(m.matchDate);
  return parsed ?? m.round;
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
