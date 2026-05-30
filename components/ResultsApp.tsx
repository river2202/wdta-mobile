"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { CachedResults, MatchResult, RoundResult, SectionResults } from "@/lib/wdta/types";

const MIN_REFRESH_AGE_MS = 60 * 60 * 1000;
const ORIGINAL_RESULTS_URL = "https://www.trols.org.au/wdta/results.php";

type RefreshResponse = {
  status: "refreshed" | "too-fresh" | "error";
  results?: CachedResults;
  message?: string;
  retryAt?: string;
};

export function ResultsApp({
  initialResults,
  initialSectionCode,
}: {
  initialResults: CachedResults;
  initialSectionCode?: string;
}) {
  const [results, setResults] = useState(initialResults);
  const [selectedSectionCode, setSelectedSectionCode] = useState(
    initialSectionCode || initialResults.sections[0]?.sectionCode,
  );
  const [now, setNow] = useState(() => Date.now());
  const [refreshMessage, setRefreshMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedSection =
    results.sections.find((section) => section.sectionCode === selectedSectionCode) ??
    results.sections[0];

  const refreshState = useMemo(() => getRefreshState(results.generatedAt, now), [results, now]);
  const originalResultsUrl = selectedSection
    ? buildOriginalResultsUrl(selectedSection.sectionCode)
    : ORIGINAL_RESULTS_URL;

  function selectSection(sectionCode: string) {
    setSelectedSectionCode(sectionCode);
    window.history.replaceState(null, "", `/?section=${sectionCode}`);
  }

  function handleRefresh() {
    if (!refreshState.canRefresh || isRefreshing) {
      return;
    }

    setRefreshMessage("");
    setIsRefreshing(true);

    void refreshResults().finally(() => setIsRefreshing(false));
  }

  async function refreshResults() {
    try {
      const response = await fetch("/api/results/refresh", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as RefreshResponse;

      if (payload.results) {
        setResults(payload.results);
        setNow(Date.now());
      }

      if (response.ok && payload.status === "refreshed") {
        setRefreshMessage("Updated just now");
        return;
      }

      setRefreshMessage(payload.message || "Cache is still fresh");
    } catch {
      setRefreshMessage("Refresh failed");
    }
  }

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
        <div className="header-actions">
          <p className="updated">
            Results loaded {results.source.resultsLoadedAt || "not yet"} · Cache{" "}
            {formatDateTime(results.generatedAt)}
          </p>
          <div className="header-button-row">
            <a className="original-link" href={originalResultsUrl}>
              Original WDTA
            </a>
            <button
              className="refresh-button"
              type="button"
              disabled={!refreshState.canRefresh || isRefreshing}
              onClick={handleRefresh}
            >
              {isRefreshing
                ? "Refreshing"
                : refreshState.canRefresh
                  ? "Refresh"
                  : `Refresh in ${formatDuration(refreshState.remainingMs)}`}
            </button>
          </div>
        </div>
        {refreshMessage ? <p className="refresh-status">{refreshMessage}</p> : null}
      </header>

      <nav className="section-tabs" aria-label="Sections">
        {results.sections.map((section) => (
          <button
            key={section.sectionCode}
            className={section.sectionCode === selectedSection?.sectionCode ? "active" : ""}
            type="button"
            onClick={() => selectSection(section.sectionCode)}
          >
            {section.sectionName.replace("Girls S/D Rubbers ", "")}
          </button>
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

function getRefreshState(generatedAt: string, now: number) {
  const generatedTime = Date.parse(generatedAt);

  if (Number.isNaN(generatedTime)) {
    return { canRefresh: true, remainingMs: 0 };
  }

  const remainingMs = Math.max(0, generatedTime + MIN_REFRESH_AGE_MS - now);
  return {
    canRefresh: remainingMs === 0,
    remainingMs,
  };
}

function buildOriginalResultsUrl(sectionCode: string) {
  const url = new URL(ORIGINAL_RESULTS_URL);
  url.searchParams.set("which", "1");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", "AA");
  url.searchParams.set("section", sectionCode);
  return url.toString();
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

function formatDuration(value: number) {
  const minutes = Math.max(1, Math.ceil(value / 60_000));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
