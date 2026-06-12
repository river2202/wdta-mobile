import Link from "next/link";

import { MatchDetailBody } from "@/components/MatchDetail";
import { SiteFooter } from "@/components/SiteFooter";
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
          {teamGroups.map((group) => {
            const record = tallyRecord(group.matches);
            return (
              <div className="player-team-block" key={`${group.team}-${group.sectionCode}`}>
                <div className="player-team-head">
                  <div className="player-team-main">
                    <strong>{group.team}</strong>
                    <span>{group.sectionName}</span>
                  </div>
                  <div className="player-team-meta">
                    {group.emergencyOnly ? <span className="emergency-badge">E</span> : null}
                    <span className="player-record">
                      <span className="player-record-w">{record.win}W</span>
                      <span className="player-record-l">{record.loss}L</span>
                      {record.draw > 0 ? (
                        <span className="player-record-d">{record.draw}D</span>
                      ) : null}
                    </span>
                  </div>
                </div>

                <div className="player-match-list">
                  {group.matches.map((m, mi) => (
                    <div className="player-match" key={`${group.sectionCode}-${m.round}-${mi}`}>
                      <div className={`player-match-row ${m.result ?? "unknown"}`}>
                        <span className={`result-tag ${m.result ?? "unknown"}`}>
                          {m.result === "win"
                            ? "WIN"
                            : m.result === "loss"
                              ? "LOST"
                              : m.result === "draw"
                                ? "DRAW"
                                : "–"}
                        </span>
                        <div className="player-match-info">
                          <span className="player-match-vs">vs {m.opponent}</span>
                          <span className="player-match-sub">
                            {m.matchDate ?? `Round ${m.round}`} · Rd {m.round}
                            {m.emergency ? " · emergency" : ""}
                          </span>
                        </div>
                        <span className="player-match-score">
                          {m.teamPoints != null && m.oppPoints != null
                            ? `${m.teamPoints}-${m.oppPoints}`
                            : "–"}
                        </span>
                      </div>
                      {m.detail ? (
                        <MatchDetailBody details={m.detail} highlightKey={highlightKey} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function tallyRecord(matches: PlayerMatch[]) {
  let win = 0;
  let loss = 0;
  let draw = 0;
  for (const m of matches) {
    if (m.result === "win") win += 1;
    else if (m.result === "loss") loss += 1;
    else if (m.result === "draw") draw += 1;
  }
  return { win, loss, draw };
}
