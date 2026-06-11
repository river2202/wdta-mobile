import type { CachedResults } from "./types";

export type PlayerAppearanceRow = {
  playerKey: string;
  playerLabel: string;
  team: string;
  competitionCode: string;
  sectionCode: string;
  sectionName: string;
  round: number;
  matchDate: string | null;
  matchId: string;
  opponent: string;
  position: string;
  emergency: boolean;
  teamPoints: number | null;
  oppPoints: number | null;
};

/** Normalise a player name into a stable lookup key (lowercase, single spaces). */
export function normalizePlayerKey(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Flatten a single-section CachedResults into per-player appearance rows.
 * Only played matches that carry roster details produce rows.
 */
export function extractAppearances(results: CachedResults): PlayerAppearanceRow[] {
  const competitionCode = results.source.competitionCode;
  const rows: PlayerAppearanceRow[] = [];

  for (const section of results.sections) {
    for (const round of section.rounds) {
      for (const match of round.matches) {
        if (match.status !== "played" || !match.matchId || !match.details) continue;

        const homePoints = match.home?.points ?? null;
        const awayPoints = match.away?.points ?? null;

        const addSide = (
          players: { position: string; name: string; emergency?: boolean }[],
          team: string,
          opponent: string,
          teamPoints: number | null,
          oppPoints: number | null,
        ) => {
          for (const player of players) {
            const label = player.name.trim();
            if (!label) continue;
            rows.push({
              playerKey: normalizePlayerKey(player.name),
              playerLabel: label,
              team,
              competitionCode,
              sectionCode: section.sectionCode,
              sectionName: section.sectionName,
              round: round.round,
              matchDate: round.date || null,
              matchId: match.matchId!,
              opponent,
              position: player.position || "",
              emergency: Boolean(player.emergency),
              teamPoints,
              oppPoints,
            });
          }
        };

        addSide(match.details.homePlayers, match.homeTeam, match.awayTeam, homePoints, awayPoints);
        addSide(match.details.awayPlayers, match.awayTeam, match.homeTeam, awayPoints, homePoints);
      }
    }
  }

  // De-dupe on the table's primary key (matchId, playerKey, position) so the
  // batch insert never trips ON CONFLICT with itself.
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.matchId}|${r.playerKey}|${r.position}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
