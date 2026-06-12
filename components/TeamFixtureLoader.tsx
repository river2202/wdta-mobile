"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TeamFixture } from "@/components/TeamFixture";
import type { TeamFixtureData } from "@/lib/wdta/teamFixture";
import type { RoundResult } from "@/lib/wdta/types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: TeamFixtureData }
  | { status: "error"; message: string };

/** Client-side loader for a team fixture that isn't cached yet. */
export function TeamFixtureLoader({
  sectionCode,
  teamCode,
  competitionCode,
  resultRounds,
}: {
  sectionCode: string;
  teamCode: string;
  competitionCode: string;
  resultRounds: RoundResult[];
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/teams/${encodeURIComponent(sectionCode)}/${encodeURIComponent(teamCode)}/fixture`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as { data?: TeamFixtureData; error?: string };
        if (cancelled) return;

        if (response.ok && payload.data) {
          setState({ status: "ready", data: payload.data });
        } else {
          setState({ status: "error", message: payload.error || "Couldn't load the fixture." });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Network error while loading the fixture." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionCode, teamCode, reloadKey]);

  function retry() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  if (state.status === "ready") {
    return (
      <TeamFixture
        fixture={state.data}
        sectionCode={sectionCode}
        teamCode={teamCode}
        competitionCode={competitionCode}
        resultRounds={resultRounds}
      />
    );
  }

  if (state.status === "error") {
    return (
      <main className="page-shell">
        <section className="empty-state">
          <h2>Couldn&apos;t load the fixture</h2>
          <p>{state.message} The results site may be busy — please try again.</p>
          <div className="recover-actions">
            <button className="recover-link" type="button" onClick={retry}>
              Retry
            </button>
            <Link
              className="recover-link recover-link--ghost"
              href={`/results?section=${encodeURIComponent(sectionCode)}`}
            >
              Back to results
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="loading-state" aria-busy="true" aria-label="Loading fixture">
        <p>Loading fixture…</p>
      </div>
    </main>
  );
}
