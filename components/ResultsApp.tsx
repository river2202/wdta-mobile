"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type {
  CachedResults,
  LadderEntry,
  MatchDetails,
  MatchPlayer,
  MatchResult,
  RoundResult,
  RubberDetail,
  SectionResults,
} from "@/lib/wdta/types";

const MIN_REFRESH_AGE_MS = 60 * 60 * 1000;
const ORIGINAL_RESULTS_URL = "https://www.trols.org.au/wdta/results.php";
const ORIGINAL_LADDERS_URL = "https://www.trols.org.au/wdta/ladders.php";
const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";

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
  const initialSelectedSectionCode = getInitialSectionCode(initialResults, initialSectionCode);
  const [results, setResults] = useState(initialResults);
  const [selectedSectionCode, setSelectedSectionCode] = useState(initialSelectedSectionCode);
  const [now, setNow] = useState(() => Date.now());
  const [refreshMessage, setRefreshMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      initialSectionCode &&
      results.sections.some((section) => section.sectionCode === initialSectionCode)
    ) {
      rememberSelectedSection(initialSectionCode);
    }
  }, [initialSectionCode, results.sections]);

  const selectedSection =
    results.sections.find((section) => section.sectionCode === selectedSectionCode) ??
    results.sections[0];

  const refreshState = useMemo(() => getRefreshState(results.generatedAt, now), [results, now]);
  const originalResultsUrl = selectedSection
    ? buildOriginalResultsUrl(selectedSection.sectionCode)
    : ORIGINAL_RESULTS_URL;

  function selectSection(sectionCode: string) {
    setSelectedSectionCode(sectionCode);
    rememberSelectedSection(sectionCode);
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
  const latestRound = Math.max(...section.rounds.map((round) => round.round));

  return (
    <section className="section-view" aria-label={section.sectionName}>
      {section.ladder ? <LadderPanel section={section} entries={section.ladder} /> : null}
      {section.rounds.map((round) => (
        <RoundCard
          key={`${section.sectionCode}-${round.round}`}
          round={round}
          defaultDetailsOpen={round.round === latestRound}
        />
      ))}
    </section>
  );
}

function LadderPanel({
  section,
  entries,
}: {
  section: SectionResults;
  entries: LadderEntry[];
}) {
  return (
    <section className="ladder-panel" aria-label={`${section.sectionName} ladder`}>
      <div className="ladder-heading">
        <div>
          <p className="panel-label">Current ladder</p>
          <h2>{section.sectionName.replace("Girls S/D Rubbers ", "")}</h2>
        </div>
        <a
          className="ladder-source-link"
          href={buildOriginalLadderUrl(section.sectionCode)}
          aria-label={`Open original ladder for ${section.sectionName}`}
        >
          Original ladder
        </a>
      </div>

      <div className="ladder-list">
        {entries.map((entry) => (
          <div className="ladder-row" key={`${section.sectionCode}-${entry.rank}-${entry.team}`}>
            <span className="ladder-rank">{entry.rank}</span>
            <div className="ladder-team">
              <strong>{entry.team}</strong>
              {entry.venueNote ? <span>{entry.venueNote}</span> : null}
            </div>
            <div className="ladder-stat">
              <span>Pts</span>
              <strong>{formatNumber(entry.points)}</strong>
            </div>
            <div className="ladder-stat">
              <span>%</span>
              <strong>{entry.percentage.toFixed(2)}</strong>
            </div>
            <a
              className="team-source-link"
              href={buildOriginalClubLadderUrl(entry.team)}
              aria-label={`Open original ladder for ${entry.team}`}
            >
              Team ladder
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoundCard({
  round,
  defaultDetailsOpen,
}: {
  round: RoundResult;
  defaultDetailsOpen: boolean;
}) {
  return (
    <section className="round-band">
      <div className="round-heading">
        <h2>Round {round.round}</h2>
        <time>{round.date}</time>
      </div>
      <div className="match-list">
        {round.matches.map((match, index) => (
          <MatchCard
            key={match.matchId ?? `${round.round}-${index}`}
            match={match}
            defaultDetailsOpen={defaultDetailsOpen}
          />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  match,
  defaultDetailsOpen,
}: {
  match: MatchResult;
  defaultDetailsOpen: boolean;
}) {
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

      {match.details ? (
        <MatchDetailPanel details={match.details} defaultOpen={defaultDetailsOpen} />
      ) : null}
    </article>
  );
}

function MatchDetailPanel({
  details,
  defaultOpen,
}: {
  details: MatchDetails;
  defaultOpen: boolean;
}) {
  return (
    <details className="match-detail" open={defaultOpen}>
      <summary>Match details</summary>
      <div className="detail-body">
        <div className="player-grid">
          <PlayerList team={details.homeTeam} players={details.homePlayers} />
          <PlayerList team={details.awayTeam} players={details.awayPlayers} align="right" />
        </div>

        <div className="rubber-list" aria-label="Rubber scores">
          {details.rubbers.map((rubber, index) => (
            <RubberRow key={`${rubber.homePosition}-${rubber.awayPosition}-${index}`} rubber={rubber} />
          ))}
        </div>
      </div>
    </details>
  );
}

function PlayerList({
  team,
  players,
  align = "left",
}: {
  team: string;
  players: MatchPlayer[];
  align?: "left" | "right";
}) {
  return (
    <div className={`player-list ${align}`}>
      <h3>{team}</h3>
      <ol>
        {players.map((player) => (
          <li key={`${player.position}-${player.name}`}>
            <span className="player-position">{player.position}</span>
            <span>{player.name}</span>
            {player.emergency ? <span className="emergency-badge">E</span> : null}
          </li>
        ))}
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

function buildOriginalLadderUrl(sectionCode: string) {
  const url = new URL(ORIGINAL_LADDERS_URL);
  url.searchParams.set("which", "1");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", "AA");
  url.searchParams.set("section", sectionCode);
  return url.toString();
}

function buildOriginalClubLadderUrl(team: string) {
  const url = new URL(ORIGINAL_LADDERS_URL);
  url.searchParams.set("which", "2");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", "AA");
  url.searchParams.set("club", team);
  return url.toString();
}

function rememberSelectedSection(sectionCode: string) {
  try {
    window.localStorage?.setItem(SELECTED_SECTION_STORAGE_KEY, sectionCode);
  } catch {
    // Cookie persistence below is enough for the next server-rendered visit.
  }

  document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=${encodeURIComponent(
    sectionCode,
  )}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function getInitialSectionCode(results: CachedResults, sectionCode?: string) {
  if (sectionCode && results.sections.some((section) => section.sectionCode === sectionCode)) {
    return sectionCode;
  }

  return results.sections[0]?.sectionCode;
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
