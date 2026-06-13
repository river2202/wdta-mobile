"use client";

import { useEffect } from "react";

import { BackLink } from "@/components/BackLink";
import { MatchDetailBody } from "@/components/MatchDetail";
import { SiteFooter } from "@/components/SiteFooter";
import { cacheKeys, useWriteCache } from "@/lib/clientCache";
import type { FixtureRound, TeamFixtureData, VenueInfo } from "@/lib/wdta/teamFixture";
import type { MatchResult, RoundResult } from "@/lib/wdta/types";

const ORIGINAL_FIXTURE_URL = "https://www.trols.org.au/wdta/fixture.php";

export type TeamFixtureProps = {
  fixture: TeamFixtureData;
  sectionCode: string;
  teamCode: string;
  competitionCode: string;
  resultRounds: RoundResult[];
};

export function TeamFixture({
  fixture,
  sectionCode,
  teamCode,
  competitionCode,
  resultRounds,
}: TeamFixtureProps) {
  const team = fixture.teamName;
  const ownVenue = findVenue(fixture.venues, team);
  const upcomingIndex = findUpcomingIndex(fixture.rounds);

  // Cache the rendered fixture so the next visit / back-navigation paints instantly.
  useWriteCache(cacheKeys.team(sectionCode, teamCode), {
    fixture,
    sectionCode,
    teamCode,
    competitionCode,
    resultRounds,
  });

  // Land the reader on their next match.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById("upcoming")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, []);

  const trolsUrl = buildTrolsFixtureUrl(competitionCode, sectionCode, teamCode);

  return (
    <main className="page-shell team-shell">
      <header className="player-header">
        <BackLink fallbackHref={`/results?section=${encodeURIComponent(sectionCode)}`} />
        <p className="eyebrow">{fixture.competitionName ?? competitionCode}</p>
        <h1>{team}</h1>
        <p className="team-sub">
          {fixture.sectionName}
          {ownVenue?.addressLines[0] ? ` · ${ownVenue.addressLines[0]}` : ""}
        </p>
        <a className="original-link team-trols-link" href={trolsUrl} target="_blank" rel="noopener noreferrer">
          Original WDTA fixture
        </a>
      </header>

      <section className="fixture-list" aria-label={`${team} fixture`}>
        {fixture.rounds.map((row, index) => (
          <FixtureRowView
            key={`${row.date}-${index}`}
            row={row}
            team={team}
            venues={fixture.venues}
            resultRounds={resultRounds}
            isUpcoming={index === upcomingIndex}
          />
        ))}

        {fixture.finals.length > 0 ? (
          <div className="finals-block">
            <p className="panel-label">Finals</p>
            {fixture.finals.map((f) => (
              <div className="fixture-row muted" key={f.label}>
                <span className="fixture-date">{f.date}</span>
                <span className="fixture-main">{f.label}</span>
                <span className="fixture-tag">TBD</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

// ---------------------------------------------------------------------------

function FixtureRowView({
  row,
  team,
  venues,
  resultRounds,
  isUpcoming,
}: {
  row: FixtureRound;
  team: string;
  venues: VenueInfo[];
  resultRounds: RoundResult[];
  isUpcoming: boolean;
}) {
  if (row.noPlay) {
    return (
      <div className="fixture-row muted">
        <span className="fixture-date">{row.date}</span>
        <span className="fixture-main">No play</span>
      </div>
    );
  }

  const isBye = /^bye$/i.test(row.home) || /^bye$/i.test(row.away);
  if (isBye) {
    return (
      <div className="fixture-row muted">
        <span className="fixture-date">{row.date}</span>
        <span className="fixture-main">Rd {row.round} · Bye</span>
      </div>
    );
  }

  const isHome = sameTeam(row.home, team);
  const opponent = isHome ? row.away : row.home;
  const match = findMatch(resultRounds, row, team, opponent);

  if (isUpcoming) {
    const venue = isHome ? findVenue(venues, team) : findVenue(venues, opponent);
    return (
      <article className="upcoming-card" id="upcoming">
        <div className="upcoming-head">
          <span className="fixture-tag upcoming-tag">Upcoming</span>
          <span className={`ha-badge ${isHome ? "home" : "away"}`}>{isHome ? "Home" : "Away"}</span>
        </div>
        <p className="upcoming-when">
          Rd {row.round} · {row.date}
        </p>
        <h2 className="upcoming-vs">vs {opponent}</h2>
        {venue ? <VenueCard venue={venue} isHome={isHome} /> : null}
      </article>
    );
  }

  // Played (or otherwise resolved) match
  if (match) {
    if (match.status === "played" && match.home && match.away) {
      const teamPoints = isHome ? match.home.points : match.away.points;
      const oppPoints = isHome ? match.away.points : match.home.points;
      const outcome = teamPoints > oppPoints ? "win" : teamPoints < oppPoints ? "loss" : "draw";

      return (
        <details className="fixture-row played">
          <summary className="fixture-played-summary collapse-summary">
          <span className="fixture-date">
            Rd {row.round}
            <br />
            {row.date}
          </span>
            <span className="fixture-main">vs {opponent}</span>
            <span className={`ha-mini ${isHome ? "home" : "away"}`}>{isHome ? "H" : "A"}</span>
            <span className={`result-tag ${outcome}`}>
              {outcome === "win" ? "WIN" : outcome === "loss" ? "LOST" : "DRAW"}
            </span>
            <span className="fixture-score">
              {formatPoints(teamPoints)}-{formatPoints(oppPoints)}
            </span>
          </summary>
          {match.details ? <MatchDetailBody details={match.details} /> : null}
        </details>
      );
    }

    const label =
      match.status === "washout" ? "Wash out" : match.status === "forfeit" ? "Forfeit" : "Pending";
    return (
      <div className="fixture-row muted">
        <span className="fixture-date">{row.date}</span>
        <span className="fixture-main">
          Rd {row.round} · vs {opponent}
        </span>
        <span className="fixture-tag">{label}</span>
      </div>
    );
  }

  // No result in the cache — future round (or not yet published)
  return (
    <div className="fixture-row">
      <span className="fixture-date">
        Rd {row.round}
        <br />
        {row.date}
      </span>
      <span className="fixture-main">vs {opponent}</span>
      <span className={`ha-mini ${isHome ? "home" : "away"}`}>{isHome ? "H" : "A"}</span>
      <span className="fixture-tag">TBD</span>
    </div>
  );
}

function VenueCard({ venue, isHome }: { venue: VenueInfo; isHome: boolean }) {
  const destination =
    venue.lat != null && venue.lng != null
      ? `${venue.lat},${venue.lng}`
      : venue.addressLines.join(", ");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  return (
    <div className="venue-card">
      <p className="venue-name">
        {isHome ? "Your home court" : `At ${venue.team}`}
        {venue.melway ? <span className="venue-melway"> · {venue.melway}</span> : null}
      </p>
      {venue.addressLines.map((line) => (
        <p className="venue-line" key={line}>
          {line}
        </p>
      ))}
      <div className="venue-actions">
        {venue.clubPhone ? (
          <a className="venue-phone" href={`tel:${venue.clubPhone.replace(/\s+/g, "")}`}>
            Club {venue.clubPhone}
          </a>
        ) : null}
        {venue.contactPhone ? (
          <a
            className="venue-phone"
            href={`tel:${venue.contactPhone.split("/")[0].replace(/\s+/g, "")}`}
          >
            {venue.contactName || "Contact"} {venue.contactPhone}
          </a>
        ) : null}
        <a className="navigate-button" href={mapsUrl} target="_blank" rel="noopener noreferrer">
          Navigate
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function sameTeam(a: string, b: string) {
  return a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();
}

function findVenue(venues: VenueInfo[], team: string) {
  return venues.find((v) => sameTeam(v.team, team));
}

function findMatch(
  rounds: RoundResult[],
  row: FixtureRound,
  team: string,
  opponent: string,
): MatchResult | undefined {
  if (row.round == null) return undefined;
  const round = rounds.find((r) => r.round === row.round);
  if (!round) return undefined;
  return round.matches.find(
    (m) =>
      (sameTeam(m.homeTeam, team) && sameTeam(m.awayTeam, opponent)) ||
      (sameTeam(m.homeTeam, opponent) && sameTeam(m.awayTeam, team)),
  );
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseFixtureDate(value: string): number | null {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/);
  if (!match) return null;
  const monthIdx = MONTHS.indexOf(match[2].toLowerCase());
  if (monthIdx < 0) return null;
  let year = Number.parseInt(match[3], 10);
  if (year < 100) year += 2000;
  return new Date(year, monthIdx, Number.parseInt(match[1], 10)).getTime();
}

/** First future (or today's) row with a real opponent. */
function findUpcomingIndex(rounds: FixtureRound[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = today.getTime();

  for (let i = 0; i < rounds.length; i++) {
    const row = rounds[i];
    if (row.noPlay) continue;
    if (/^bye$/i.test(row.home) || /^bye$/i.test(row.away)) continue;
    const time = parseFixtureDate(row.date);
    if (time != null && time >= cutoff) return i;
  }
  return -1;
}

function buildTrolsFixtureUrl(competitionCode: string, sectionCode: string, teamCode: string) {
  const url = new URL(ORIGINAL_FIXTURE_URL);
  url.searchParams.set("which", "2");
  url.searchParams.set("style", "");
  url.searchParams.set("daytime", competitionCode);
  url.searchParams.set("section", sectionCode);
  url.searchParams.set("team", teamCode);
  return url.toString();
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
