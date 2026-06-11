import Link from "next/link";

import { MatchDetailBody } from "@/components/MatchDetail";
import type { MatchDetails } from "@/lib/wdta/types";

export type PlayerMatch = {
  matchDate: string | null;
  round: number;
  opponent: string;
  teamPoints: number | null;
  oppPoints: number | null;
  result: "win" | "loss" | "draw" | null;
  emergency: boolean;
  position: string;
  detail?: MatchDetails | null;
};

export type PlayerTeamGroup = {
  team: string;
  sectionName: string;
  sectionCode: string;
  /** True when every appearance for this team was as an emergency (a fill-in). */
  emergencyOnly: boolean;
  matches: PlayerMatch[];
};

export function PlayerProfile({
  name,
  teamGroups,
  backHref,
  highlightKey,
}: {
  name: string;
  teamGroups: PlayerTeamGroup[];
  backHref: string;
  highlightKey?: string;
}) {
  const primaryTeam = teamGroups[0];

  return (
    <main className="page-shell">
      <header className="player-header">
        <Link className="player-back" href={backHref} aria-label="Back to results">
          ‹ Back
        </Link>
        <p className="eyebrow">Player</p>
        <h1>{name}</h1>
        {primaryTeam ? <p className="player-team-line">{primaryTeam.team}</p> : null}
      </header>

      {teamGroups.length === 0 ? (
        <section className="empty-state">
          <h2>No matches found yet</h2>
          <p>
            This player&apos;s matches aren&apos;t cached yet. Sections refresh over the next day or
            two — check back soon.
          </p>
        </section>
      ) : (
        <section className="player-block" aria-label="Teams and matches">
          <p className="panel-label">Team / club</p>
          {teamGroups.map((group, i) => (
            <details
              className="player-team-group"
              key={`${group.team}-${group.sectionCode}`}
              open={i === 0}
            >
              <summary className="player-team-summary collapse-summary">
                <div className="player-team-main">
                  <strong>{group.team}</strong>
                  <span>{group.sectionName}</span>
                </div>
                <div className="player-team-meta">
                  {group.emergencyOnly ? <span className="emergency-badge">E</span> : null}
                  <span className="player-team-count">
                    {group.matches.length} {group.matches.length === 1 ? "match" : "matches"}
                  </span>
                </div>
              </summary>

              <div className="player-match-list">
                {group.matches.map((m, mi) => (
                  <details className="player-match" key={`${group.sectionCode}-${m.round}-${mi}`}>
                    <summary className="player-match-summary collapse-summary">
                      <span className="player-match-when">
                        <span className="player-match-date">{m.matchDate ?? `Round ${m.round}`}</span>
                        <span className="player-match-vs">vs {m.opponent}</span>
                      </span>
                      {m.result ? (
                        <span className={`result-pill ${m.result}`}>
                          {m.result === "win" ? "W" : m.result === "loss" ? "L" : "D"}
                        </span>
                      ) : null}
                      <span className="player-match-score">
                        {m.teamPoints != null && m.oppPoints != null
                          ? `${m.teamPoints}-${m.oppPoints}`
                          : "–"}
                      </span>
                    </summary>
                    {m.detail ? (
                      <MatchDetailBody details={m.detail} highlightKey={highlightKey} />
                    ) : (
                      <p className="player-match-nodetail">Match detail not available.</p>
                    )}
                  </details>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
