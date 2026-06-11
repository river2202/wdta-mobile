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
          return (
            <RubberRow
              key={`${rubber.homePosition}-${rubber.awayPosition}-${index}`}
              rubber={rubber}
              highlightSide={mineSide}
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
          return (
            <li
              key={`${player.position}-${player.name}`}
              className={isHighlight ? "is-highlight" : undefined}
            >
              <span className="player-position">{player.position}</span>
              <Link className="player-link" href={`/player/${encodeURIComponent(player.name)}`}>
                {player.name}
              </Link>
              {player.emergency ? <span className="emergency-badge">E</span> : null}
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
}: {
  rubber: RubberDetail;
  highlightSide?: "home" | "away" | null;
}) {
  return (
    <div className={`rubber-row${highlightSide ? " rubber-row--mine" : ""}`}>
      <span className={`rubber-side${highlightSide === "home" ? " mine" : ""}`}>
        {rubber.homePosition}
      </span>
      <strong className="rubber-score">
        {rubber.scoreLines.length > 0 ? rubber.scoreLines.join("  ") : "-"}
      </strong>
      <span className={`rubber-side right${highlightSide === "away" ? " mine" : ""}`}>
        {rubber.awayPosition}
      </span>
    </div>
  );
}
