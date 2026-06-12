import Link from "next/link";

import { normalizePlayerKey } from "@/lib/wdta/appearances";
import type { MatchDetails, MatchPlayer, RubberDetail } from "@/lib/wdta/types";

/** Rosters + rubber scores for a match. Pure/presentational — works in both
 *  client (ResultsApp) and server (player page) components. */
export function MatchDetailBody({
  details,
  highlightKey,
}: {
  details: MatchDetails;
  /** Normalized player key to emphasize in the rosters (e.g. the profile owner). */
  highlightKey?: string;
}) {
  const me = findPlayerSide(details, highlightKey);

  return (
    <div className="detail-body">
      <div className="player-grid">
        <PlayerList team={details.homeTeam} players={details.homePlayers} highlightKey={highlightKey} />
        <PlayerList
          team={details.awayTeam}
          players={details.awayPlayers}
          align="right"
          highlightKey={highlightKey}
        />
      </div>

      <div className="rubber-list" aria-label="Rubber scores">
        {details.rubbers.map((rubber, index) => {
          const mineSide =
            me.side === "home" && positionInCode(rubber.homePosition, me.position)
              ? "home"
              : me.side === "away" && positionInCode(rubber.awayPosition, me.position)
                ? "away"
                : null;
          const outcome = mineSide ? rubberOutcome(rubber.scoreLines, mineSide) : null;
          return (
            <RubberRow
              key={`${rubber.homePosition}-${rubber.awayPosition}-${index}`}
              rubber={rubber}
              highlightSide={mineSide}
              outcome={outcome}
            />
          );
        })}
      </div>
    </div>
  );
}

type PlayerSide = { side: "home" | "away" | null; position: string };

/** Find which side the highlighted player is on, and their position number. */
function findPlayerSide(details: MatchDetails, highlightKey?: string): PlayerSide {
  if (!highlightKey) return { side: null, position: "" };
  const home = details.homePlayers.find((p) => normalizePlayerKey(p.name) === highlightKey);
  if (home) return { side: "home", position: home.position };
  const away = details.awayPlayers.find((p) => normalizePlayerKey(p.name) === highlightKey);
  if (away) return { side: "away", position: away.position };
  return { side: null, position: "" };
}

/** True if a rubber position code (e.g. "1", "1+2") includes the player's position number. */
function positionInCode(code: string, position: string): boolean {
  if (!position) return false;
  const tokens = code.match(/\d+/g);
  return tokens ? tokens.includes(position) : false;
}

/**
 * Decide whether `side` won a rubber from its set scores (home perspective,
 * e.g. "6-1 6-1"). Tiebreak details in parentheses are ignored. Returns null
 * when the winner can't be determined (no scores, forfeit text, even sets).
 */
function rubberOutcome(scoreLines: string[], side: "home" | "away"): "win" | "loss" | null {
  const text = scoreLines.join(" ").replace(/\([^)]*\)/g, "");
  let homeSets = 0;
  let awaySets = 0;
  for (const set of text.matchAll(/(\d+)\s*-\s*(\d+)/g)) {
    const home = Number.parseInt(set[1], 10);
    const away = Number.parseInt(set[2], 10);
    if (home > away) homeSets++;
    else if (away > home) awaySets++;
  }
  if (homeSets === awaySets) return null;
  const winner = homeSets > awaySets ? "home" : "away";
  return side === winner ? "win" : "loss";
}

export function PlayerList({
  team,
  players,
  align = "left",
  highlightKey,
}: {
  team: string;
  players: MatchPlayer[];
  align?: "left" | "right";
  highlightKey?: string;
}) {
  return (
    <div className={`player-list ${align}`}>
      <h3>{team}</h3>
      <ol>
        {players.map((player) => {
          const isHighlight = Boolean(highlightKey) && normalizePlayerKey(player.name) === highlightKey;
          const positionBadge = <span className="player-position">{player.position}</span>;
          const emergencyBadge = player.emergency ? (
            <span className="emergency-badge">E</span>
          ) : null;
          const nameLink = (
            <Link className="player-link" href={`/player/${encodeURIComponent(player.name)}`}>
              {player.name}
            </Link>
          );
          return (
            <li
              key={`${player.position}-${player.name}`}
              className={isHighlight ? "is-highlight" : undefined}
            >
              {align === "right" ? (
                // Mirror layout: number on the outer (right) edge.
                <>
                  {emergencyBadge}
                  {nameLink}
                  {positionBadge}
                </>
              ) : (
                <>
                  {positionBadge}
                  {nameLink}
                  {emergencyBadge}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RubberRow({
  rubber,
  highlightSide,
  outcome,
}: {
  rubber: RubberDetail;
  highlightSide?: "home" | "away" | null;
  outcome?: "win" | "loss" | null;
}) {
  const rowClass = [
    "rubber-row",
    highlightSide ? "rubber-row--mine" : "",
    highlightSide && outcome === "loss" ? "is-loss" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const badge =
    highlightSide && outcome ? (
      <span className={`rubber-outcome ${outcome}`} aria-label={outcome === "win" ? "Won" : "Lost"}>
        {outcome === "win" ? "W" : "L"}
      </span>
    ) : null;

  return (
    <div className={rowClass}>
      <span className={`rubber-side${highlightSide === "home" ? " mine" : ""}`}>
        {rubber.homePosition}
        {highlightSide === "home" ? badge : null}
      </span>
      <strong className="rubber-score">
        {rubber.scoreLines.length > 0 ? rubber.scoreLines.join("  ") : "-"}
      </strong>
      <span className={`rubber-side right${highlightSide === "away" ? " mine" : ""}`}>
        {highlightSide === "away" ? badge : null}
        {rubber.awayPosition}
      </span>
    </div>
  );
}
