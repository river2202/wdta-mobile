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
        {details.rubbers.map((rubber, index) => (
          <RubberRow key={`${rubber.homePosition}-${rubber.awayPosition}-${index}`} rubber={rubber} />
        ))}
      </div>
    </div>
  );
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

function RubberRow({ rubber }: { rubber: RubberDetail }) {
  return (
    <div className="rubber-row">
      <span className="rubber-side">{rubber.homePosition}</span>
      <strong className="rubber-score">
        {rubber.scoreLines.length > 0 ? rubber.scoreLines.join("  ") : "-"}
      </strong>
      <span className="rubber-side right">{rubber.awayPosition}</span>
    </div>
  );
}
