"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { MatchDetailBody } from "@/components/MatchDetail";
import type {
  CachedResults,
  LadderEntry,
  MatchDetails,
  MatchResult,
  RoundResult,
  SectionResults,
} from "@/lib/wdta/types";

const AUTO_REFRESH_AGE_MS = 2 * 60 * 60 * 1000; // auto-refresh when cache older than 2h
const ORIGINAL_RESULTS_URL = "https://www.trols.org.au/wdta/results.php";
const ORIGINAL_LADDERS_URL = "https://www.trols.org.au/wdta/ladders.php";
const ORIGINAL_FIXTURE_URL = "https://www.trols.org.au/wdta/fixture.php";
const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";
const SEEN_RESULTS_STORAGE_KEY = "wdta-mobile-seen-results";
// Set NEXT_PUBLIC_BUYMEACOFFEE_URL in your env / Vercel dashboard to your own page.
// When it's unset, the donate buttons are hidden entirely.
const BUY_ME_A_COFFEE_URL = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;

type RefreshResponse = {
  status: "refreshed" | "too-fresh" | "error";
  results?: CachedResults;
  message?: string;
  retryAt?: string;
};

type NewResultsNotice = {
  previousLoadedAt: string;
  currentLoadedAt: string;
};

export function ResultsApp({
  initialResults,
  sectionCode,
}: {
  initialResults: CachedResults;
  /** The section code used to call the correct refresh API endpoint. */
  sectionCode?: string;
}) {
  const [results, setResults] = useState(initialResults);
  const [refreshMessage, setRefreshMessage] = useState("");
  // Start in "refreshing" state when the cache is already older than 2 hours.
  const [isRefreshing, setIsRefreshing] = useState(
    () => Boolean(sectionCode) && isCacheStale(initialResults.generatedAt),
  );
  const [newResultsNotice, setNewResultsNotice] = useState<NewResultsNotice | null>(null);
  const currentResultsStamp = getResultsUpdateStamp(results);

  // Auto-refresh: when the page opens, if the cache is older than 2 hours,
  // silently refresh the database in the background and update the view.
  useEffect(() => {
    if (!sectionCode || !isCacheStale(initialResults.generatedAt)) {
      return;
    }

    let cancelled = false;
    const refreshUrl = `/api/sections/${encodeURIComponent(sectionCode)}/refresh`;

    (async () => {
      try {
        const response = await fetch(refreshUrl, { method: "GET", cache: "no-store" });
        const payload = (await response.json()) as RefreshResponse;
        if (cancelled) return;

        if (payload.results) {
          setResults(payload.results);
        }
        if (response.ok && payload.status === "refreshed") {
          setRefreshMessage("Updated just now");
        }
      } catch {
        // Background refresh failed — keep showing the cached data silently.
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentResultsStamp) {
      return;
    }

    const timer = window.setTimeout(() => {
      const lastSeenResultsStamp = readBrowserValue(SEEN_RESULTS_STORAGE_KEY);

      if (!lastSeenResultsStamp) {
        rememberBrowserValue(SEEN_RESULTS_STORAGE_KEY, currentResultsStamp);
        setNewResultsNotice(null);
        return;
      }

      if (lastSeenResultsStamp !== currentResultsStamp) {
        setNewResultsNotice({
          previousLoadedAt: lastSeenResultsStamp,
          currentLoadedAt: currentResultsStamp,
        });
        return;
      }

      setNewResultsNotice(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentResultsStamp]);

  const selectedSection = results.sections[0];

  const originalResultsUrl = selectedSection
    ? buildOriginalResultsUrl(results.source.competitionCode, selectedSection.sectionCode)
    : ORIGINAL_RESULTS_URL;

  function handleChangeTeam() {
    // Clear saved selection so the landing page shows the selector
    try {
      window.localStorage?.removeItem(SELECTED_SECTION_STORAGE_KEY);
    } catch {
      // ignore
    }
    document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    window.location.href = "/";
  }

  function acknowledgeNewResults() {
    if (currentResultsStamp) {
      rememberBrowserValue(SEEN_RESULTS_STORAGE_KEY, currentResultsStamp);
    }

    setNewResultsNotice(null);
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-row">
          <Image src="/tennis-mark.svg" alt="" className="brand-mark" width={48} height={48} />
          <div className="brand-text">
            <p className="eyebrow">{results.source.competitionName}</p>
            <div className="title-row">
              <h1>{selectedSection?.sectionName ?? "Results"}</h1>
              <button
                className="change-section-btn"
                type="button"
                onClick={handleChangeTeam}
                aria-label="Change section"
                title="Change section"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 4 3 8l4 4" />
                  <path d="M3 8h14" />
                  <path d="m17 20 4-4-4-4" />
                  <path d="M21 16H7" />
                </svg>
              </button>
            </div>
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
            {BUY_ME_A_COFFEE_URL ? (
              <a
                className="bmc-icon"
                href={BUY_ME_A_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy me a coffee"
                title="Buy me a coffee"
              >
                <CoffeeIcon />
              </a>
            ) : null}
          </div>
        </div>
        {isRefreshing ? (
          <p className="refresh-status">Updating…</p>
        ) : refreshMessage ? (
          <p className="refresh-status">{refreshMessage}</p>
        ) : null}
        {newResultsNotice ? (
          <section className="new-results-banner" aria-label="New results">
            <div>
              <p className="new-results-title">New results available</p>
              <p>
                Source updated {newResultsNotice.currentLoadedAt}. Last seen{" "}
                {newResultsNotice.previousLoadedAt}.
              </p>
            </div>
            <button type="button" onClick={acknowledgeNewResults}>
              Mark as seen
            </button>
          </section>
        ) : null}
      </header>

      {selectedSection ? (
        <SectionView
          section={selectedSection}
          competitionCode={results.source.competitionCode}
        />
      ) : (
        <section className="empty-state">
          <h2>No cached results yet</h2>
          <p>Run `npm run refresh:data` to create the first WDTA cache.</p>
        </section>
      )}

      <footer className="page-footer">
        {BUY_ME_A_COFFEE_URL ? (
          <a
            className="bmc-button"
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CoffeeIcon />
            <span>Buy me a coffee</span>
          </a>
        ) : null}
        <p className="footer-note">Made for tennis parents · not affiliated with WDTA/TROLS</p>
      </footer>
    </main>
  );
}

function SectionView({
  section,
  competitionCode,
}: {
  section: SectionResults;
  competitionCode: string;
}) {
  const latestRound = Math.max(...section.rounds.map((round) => round.round));
  // Show the latest round first; older rounds follow, collapsed by default.
  const rounds = [...section.rounds].sort((a, b) => b.round - a.round);

  return (
    <section className="section-view" aria-label={section.sectionName}>
      {section.ladder ? (
        <LadderPanel
          section={section}
          entries={section.ladder}
          competitionCode={competitionCode}
        />
      ) : null}
      {rounds.map((round) => (
        <RoundCard
          key={`${section.sectionCode}-${round.round}`}
          round={round}
          defaultOpen={round.round === latestRound}
        />
      ))}
    </section>
  );
}

function LadderPanel({
  section,
  entries,
  competitionCode,
}: {
  section: SectionResults;
  entries: LadderEntry[];
  competitionCode: string;
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
          href={buildOriginalLadderUrl(competitionCode, section.sectionCode)}
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
            {entry.teamCode ? (
              <a
                className="team-fixture-link"
                href={buildFixtureUrl(competitionCode, section.sectionCode, entry.teamCode)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Fixture for ${entry.team}`}
              >
                Fixture
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function RoundCard({ round, defaultOpen }: { round: RoundResult; defaultOpen: boolean }) {
  return (
    <details className="round-band" open={defaultOpen}>
      <summary className="round-heading">
        <h2>Round {round.round}</h2>
        <span className="round-toggle" aria-hidden="true" />
        <time>{round.date}</time>
      </summary>
      <div className="match-list">
        {round.matches.map((match, index) => (
          <MatchCard
            key={match.matchId ?? `${round.round}-${index}`}
            match={match}
            defaultDetailsOpen={false}
          />
        ))}
      </div>
    </details>
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
      <MatchDetailBody details={details} />
    </details>
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

function isCacheStale(generatedAt: string) {
  const generatedTime = Date.parse(generatedAt);
  if (Number.isNaN(generatedTime)) {
    return false;
  }
  return Date.now() - generatedTime >= AUTO_REFRESH_AGE_MS;
}

function CoffeeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  );
}

function buildOriginalResultsUrl(competitionCode: string, sectionCode: string) {
  const url = new URL(ORIGINAL_RESULTS_URL);
  url.searchParams.set("which", "1");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", competitionCode);
  url.searchParams.set("section", sectionCode);
  return url.toString();
}

function buildOriginalLadderUrl(competitionCode: string, sectionCode: string) {
  const url = new URL(ORIGINAL_LADDERS_URL);
  url.searchParams.set("which", "1");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", competitionCode);
  url.searchParams.set("section", sectionCode);
  return url.toString();
}

function buildFixtureUrl(competitionCode: string, sectionCode: string, teamCode: string) {
  const url = new URL(ORIGINAL_FIXTURE_URL);
  url.searchParams.set("which", "2");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", competitionCode);
  url.searchParams.set("section", sectionCode);
  url.searchParams.set("team", teamCode);
  return url.toString();
}


function rememberBrowserValue(key: string, value: string) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Cookie persistence below is enough for the next visit.
  }

  document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function readBrowserValue(key: string) {
  try {
    const localValue = window.localStorage?.getItem(key);

    if (localValue) {
      return localValue;
    }
  } catch {
    // Fall back to the cookie written alongside localStorage.
  }

  return readCookieValue(key);
}

function readCookieValue(key: string) {
  const prefix = `${key}=`;
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));

  if (!match) {
    return undefined;
  }

  const rawValue = match.slice(prefix.length);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function getResultsUpdateStamp(results: CachedResults) {
  return results.source.resultsLoadedAt || results.generatedAt;
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
