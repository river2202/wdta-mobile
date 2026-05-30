import Image from "next/image";

import cachedResults from "@/data/wdta-results.json";
import type { CachedResults, MatchResult, RoundResult, SectionResults } from "@/lib/wdta/types";

const results = cachedResults as CachedResults;

type PageProps = {
  searchParams?: Promise<{
    section?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedSection =
    results.sections.find((section) => section.sectionCode === params?.section) ??
    results.sections[0];

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-row">
          <Image src="/tennis-mark.svg" alt="" className="brand-mark" width={48} height={48} />
          <div>
            <p className="eyebrow">{results.source.competitionName}</p>
            <h1>Girls S/D Rubbers</h1>
          </div>
        </div>
        <p className="updated">
          Results loaded {results.source.resultsLoadedAt || "not yet"} · Cache{" "}
          {formatDateTime(results.generatedAt)}
        </p>
      </header>

      <nav className="section-tabs" aria-label="Sections">
        {results.sections.map((section) => (
          <a
            key={section.sectionCode}
            className={section.sectionCode === selectedSection?.sectionCode ? "active" : ""}
            href={`/?section=${section.sectionCode}`}
          >
            {section.sectionName.replace("Girls S/D Rubbers ", "")}
          </a>
        ))}
      </nav>

      {selectedSection ? (
        <SectionView section={selectedSection} />
      ) : (
        <section className="empty-state">
          <h2>No cached results yet</h2>
          <p>Run `npm run refresh:data` to create the first WDTA cache.</p>
        </section>
      )}
    </main>
  );
}

function SectionView({ section }: { section: SectionResults }) {
  return (
    <section className="section-view" aria-label={section.sectionName}>
      {section.rounds.map((round) => (
        <RoundCard key={`${section.sectionCode}-${round.round}`} round={round} />
      ))}
    </section>
  );
}

function RoundCard({ round }: { round: RoundResult }) {
  return (
    <section className="round-band">
      <div className="round-heading">
        <h2>Round {round.round}</h2>
        <time>{round.date}</time>
      </div>
      <div className="match-list">
        {round.matches.map((match, index) => (
          <MatchCard key={match.matchId ?? `${round.round}-${index}`} match={match} />
        ))}
      </div>
    </section>
  );
}

function MatchCard({ match }: { match: MatchResult }) {
  if (match.status !== "played" || !match.home || !match.away) {
    return <StatusCard match={match} />;
  }

  const homeWon = match.home.points > match.away.points;
  const awayWon = match.away.points > match.home.points;

  return (
    <article className="match-card">
      <div className="scoreline">
        <TeamName name={match.homeTeam} active={homeWon} />
        <div className="points" aria-label="Points score">
          <span className={homeWon ? "winner" : ""}>{formatNumber(match.home.points)}</span>
          <span className="dash">-</span>
          <span className={awayWon ? "winner" : ""}>{formatNumber(match.away.points)}</span>
        </div>
        <TeamName name={match.awayTeam} active={awayWon} align="right" />
      </div>

      {match.venueNote ? <p className="venue-note">{match.venueNote}</p> : null}

      <div className="stat-grid" aria-label="Match statistics">
        <Stat label="R" home={match.home.rubbers} away={match.away.rubbers} />
        <Stat label="S" home={match.home.sets} away={match.away.sets} />
        <Stat label="G" home={match.home.games} away={match.away.games} />
      </div>
    </article>
  );
}

function StatusCard({ match }: { match: MatchResult }) {
  if (match.status === "bye") {
    const byeTeam = /^bye$/i.test(match.homeTeam) ? match.awayTeam : match.homeTeam;

    return (
      <article className="match-card status-card">
        <div className="status-row single">
          <TeamName name={byeTeam} />
          <span className="status-pill bye">Bye</span>
        </div>
        {match.venueNote ? <p className="venue-note">{match.venueNote}</p> : null}
      </article>
    );
  }

  const label =
    match.status === "washout"
      ? "Wash Out"
      : match.status === "forfeit"
        ? "Forfeited By"
        : "Pending";

  return (
    <article className="match-card status-card">
      <div className="status-row">
        <TeamName name={match.homeTeam} />
        <span className={`status-pill ${match.status}`}>{label}</span>
        <TeamName name={match.awayTeam} align="right" />
      </div>
      {match.venueNote ? <p className="venue-note">{match.venueNote}</p> : null}
    </article>
  );
}

function TeamName({
  name,
  active = false,
  align = "left",
}: {
  name: string;
  active?: boolean;
  align?: "left" | "right";
}) {
  return <p className={`team-name ${active ? "winner" : ""} ${align}`}>{name}</p>;
}

function Stat({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {home} - {away}
      </strong>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return "not yet";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
