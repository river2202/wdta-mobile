"use client";

import { useEffect, useState } from "react";

import { ResultsApp } from "@/components/ResultsApp";
import type { CachedResults } from "@/lib/wdta/types";

const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; results: CachedResults }
  | { status: "error"; message: string };

/**
 * Client-side loader for a section that isn't cached yet. It calls the on-demand
 * results API (which fetches from TROLS and caches), showing a spinner while it
 * works. On failure it offers Retry and "choose another section" — it does NOT
 * clear the saved selection automatically (only the explicit back action does).
 */
export function SectionLoader({ sectionCode }: { sectionCode: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/sections/${encodeURIComponent(sectionCode)}/results`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as { results?: CachedResults; error?: string };
        if (cancelled) return;

        if (response.ok && payload.results) {
          setState({ status: "ready", results: payload.results });
        } else {
          setState({ status: "error", message: payload.error || "Couldn't load results." });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Network error while loading results." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionCode, reloadKey]);

  function retry() {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  }

  if (state.status === "ready") {
    return <ResultsApp initialResults={state.results} sectionCode={sectionCode} />;
  }

  if (state.status === "error") {
    return (
      <main className="page-shell">
        <section className="empty-state">
          <h2>Couldn&apos;t load that section</h2>
          <p>{state.message} The results site may be busy — please try again.</p>
          <div className="recover-actions">
            <button className="recover-link" type="button" onClick={retry}>
              Retry
            </button>
            <button
              className="recover-link recover-link--ghost"
              type="button"
              onClick={chooseAnother}
            >
              Choose another section
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="loading-state" aria-busy="true" aria-label="Loading results">
        <p>Loading results…</p>
      </div>
    </main>
  );
}

function chooseAnother() {
  try {
    window.localStorage?.removeItem(SELECTED_SECTION_STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  window.location.href = "/?change=1";
}
