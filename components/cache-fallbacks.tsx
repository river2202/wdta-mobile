"use client";

import { PlayerProfile, type PlayerProfileProps } from "@/components/PlayerProfile";
import { ResultsApp } from "@/components/ResultsApp";
import { TeamFixture, type TeamFixtureProps } from "@/components/TeamFixture";
import { cacheKeys, readCache } from "@/lib/clientCache";
import { normalizePlayerKey } from "@/lib/wdta/appearances";
import type { CachedResults } from "@/lib/wdta/types";

/**
 * Suspense fallbacks that paint the last-known data from localStorage while the
 * server revalidates. They receive the route params as props (the page knows
 * them synchronously), so on a client-side navigation the cached view paints
 * immediately — far faster than waiting for the server DB round-trip. On a cache
 * miss they show a lightweight loading shell. Each renders the same component as
 * the server path, so the swap to fresh data is seamless.
 *
 * On the server (hard load) localStorage is unavailable, so these render the
 * loading shell and the real (streamed) server content replaces them.
 */

function LoadingShell({ label }: { label: string }) {
  return (
    <main className="page-shell">
      <div className="loading-state" aria-busy="true" aria-label={label}>
        <p>{label}…</p>
      </div>
    </main>
  );
}

export function CachedResults({ sectionCode }: { sectionCode: string }) {
  const cached = readCache<CachedResults>(cacheKeys.results(sectionCode));
  // No sectionCode → render-only (the streamed server instance owns refresh + caching).
  if (cached) return <ResultsApp initialResults={cached.data} />;
  return <LoadingShell label="Loading results" />;
}

export function CachedTeam({ sectionCode, teamCode }: { sectionCode: string; teamCode: string }) {
  const cached = readCache<TeamFixtureProps>(cacheKeys.team(sectionCode, teamCode));
  if (cached) return <TeamFixture {...cached.data} />;
  return <LoadingShell label="Loading fixture" />;
}

export function CachedPlayer({ nameParam }: { nameParam: string }) {
  const key = normalizePlayerKey(safeDecode(nameParam));
  const cached = readCache<PlayerProfileProps>(cacheKeys.player(key));
  if (cached) return <PlayerProfile {...cached.data} />;
  return <LoadingShell label="Loading player" />;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
