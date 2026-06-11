import Link from "next/link";

export type PlayerTeam = {
  team: string;
  sectionName: string;
  sectionCode: string;
  count: number;
  /** True when every appearance for this team was as an emergency (a fill-in). */
  emergencyOnly: boolean;
};

export type PlayerMatch = {
  matchDate: string | null;
  round: number;
  sectionName: string;
  sectionCode: string;
  team: string;
  opponent: string;
  teamPoints: number | null;
  oppPoints: number | null;
  result: "win" | "loss" | "draw" | null;
  emergency: boolean;
  position: string;
};

export function PlayerProfile({
  name,
  teams,
  matches,
  backHref,
}: {
  name: string;
  teams: PlayerTeam[];
  matches: PlayerMatch[];
  backHref: string;
}) {
  const primaryTeam = teams[0];

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

      {teams.length === 0 ? (
        <section className="empty-state">
          <h2>No matches found yet</h2>
          <p>
            This player&apos;s matches aren&apos;t cached yet. Sections refresh over the next day or
            two — check back soon.
          </p>
        </section>
      ) : (
        <>
          <section className="player-block" aria-label="Teams">
            <p className="panel-label">Team / club</p>
            <div className="player-team-list">
              {teams.map((t) => (
                <div className="player-team-card" key={`${t.team}-${t.sectionCode}`}>
                  <div className="player-team-main">
                    <strong>{t.team}</strong>
                    <span>{t.sectionName}</span>
                  </div>
                  <div className="player-team-meta">
                    {t.emergencyOnly ? <span className="emergency-badge">E</span> : null}
                    <span className="player-team-count">
                      {t.count} {t.count === 1 ? "match" : "matches"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="player-block" aria-label="Match history">
            <p className="panel-label">Match history</p>
            <div className="player-match-list">
              {matches.map((m, i) => (
                <article className="player-match" key={`${m.sectionCode}-${m.round}-${i}`}>
                  <div className="player-match-top">
                    <span className="player-match-date">{m.matchDate ?? `Round ${m.round}`}</span>
                    <span className="player-match-section">
                      {m.sectionName} · Rd {m.round}
                    </span>
                    {m.result ? (
                      <span className={`result-pill ${m.result}`}>
                        {m.result === "win" ? "W" : m.result === "loss" ? "L" : "D"}
                      </span>
                    ) : null}
                  </div>
                  <div className="player-match-body">
                    <span className="player-match-team">
                      {m.team}
                      {m.emergency ? <span className="emergency-badge inline">E</span> : null}
                    </span>
                    <span className="player-match-score">
                      {m.teamPoints != null && m.oppPoints != null
                        ? `${m.teamPoints}-${m.oppPoints}`
                        : "–"}
                    </span>
                    <span className="player-match-opp">{m.opponent}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
