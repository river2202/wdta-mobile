"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";

export type CompetitionOption = { code: string; name: string };
export type SectionOption = { code: string; name: string; competitionCode: string };

type PlayerSearchSection = { sectionCode: string; sectionName: string; team: string };
type PlayerSearchResult = { key: string; label: string; sections: PlayerSearchSection[] };

export function LandingPage({
  competitions,
  sections,
}: {
  competitions: CompetitionOption[];
  sections: SectionOption[];
}) {
  const router = useRouter();
  const [pickedComp, setPickedComp] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [pickedPlayer, setPickedPlayer] = useState<PlayerSearchResult | null>(null);

  // On mount: if a section was previously saved, go directly to results
  useEffect(() => {
    try {
      const saved = window.localStorage?.getItem(SELECTED_SECTION_STORAGE_KEY);
      if (saved) {
        router.replace(`/results?section=${encodeURIComponent(saved)}`);
      }
    } catch {
      // localStorage not available — cookie fallback handled server-side
    }
  }, [router]);

  // Debounced player-name search
  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (q.length < 1) {
        if (!cancelled) setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function pickSection(sectionCode: string) {
    rememberSection(sectionCode);
    router.push(`/results?section=${encodeURIComponent(sectionCode)}`);
  }

  function selectPlayer(player: PlayerSearchResult) {
    if (player.sections.length === 1) {
      pickSection(player.sections[0].sectionCode);
    } else {
      setPickedPlayer(player);
    }
  }

  const selectedComp = competitions.find((c) => c.code === pickedComp);
  const filteredSections = sections.filter((s) => s.competitionCode === pickedComp);

  return (
    <main className="landing-shell">
      <header className="landing-header">
        <Image src="/tennis-mark.svg" alt="" className="brand-mark" width={40} height={40} />
        <div>
          <h1 className="landing-title">WDTA Results</h1>
          <p className="landing-tagline">Mobile-friendly layout for your team</p>
        </div>
      </header>

      {pickedPlayer ? (
        // ── Screen: a player with multiple teams/sections ──────────────────
        <>
          <button className="comp-band" type="button" onClick={() => setPickedPlayer(null)}>
            <span className="comp-band-arrow">‹</span>
            <span className="comp-band-name">{pickedPlayer.label}</span>
          </button>
          <section className="option-section">
            <p className="landing-prompt">Select team / section</p>
            <div className="option-list">
              {pickedPlayer.sections.map((s, i) => (
                <button
                  key={s.sectionCode}
                  className="option-card option-card--fly-in"
                  type="button"
                  style={{ animationDelay: `${i * 55}ms` }}
                  onClick={() => pickSection(s.sectionCode)}
                >
                  <span className="option-card-name">
                    {s.team} · {s.sectionName}
                  </span>
                  <span className="option-card-arrow">›</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : pickedComp ? (
        // ── Screen: a competition's sections ───────────────────────────────
        <>
          <button className="comp-band" type="button" onClick={() => setPickedComp(null)}>
            <span className="comp-band-arrow">‹</span>
            <span className="comp-band-name">{selectedComp?.name}</span>
          </button>
          <section className="option-section">
            <p className="landing-prompt">Select your section</p>
            <div className="option-list">
              {filteredSections.length === 0 ? (
                <p className="option-empty">No sections available yet — try again shortly.</p>
              ) : (
                filteredSections.map((s, i) => (
                  <button
                    key={s.code}
                    className="option-card option-card--fly-in"
                    type="button"
                    style={{ animationDelay: `${i * 55}ms` }}
                    onClick={() => pickSection(s.code)}
                  >
                    <span className="option-card-name">{s.name}</span>
                    <span className="option-card-arrow">›</span>
                  </button>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        // ── Screen: home (player search + competition list) ────────────────
        <>
          <section className="player-search">
            <label className="search-label" htmlFor="player-search-input">
              Player name
            </label>
            <input
              id="player-search-input"
              className="search-input"
              type="text"
              autoComplete="off"
              placeholder="Type a player's name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim().length > 0 ? (
              <div className="search-results">
                {results.length === 0 ? (
                  <p className="search-empty">No players found</p>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.key}
                      className="search-result"
                      type="button"
                      onClick={() => selectPlayer(p)}
                    >
                      <span className="search-result-name">{p.label}</span>
                      <span className="search-result-sub">{playerSub(p)}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </section>

          <div className="or-divider">
            <span>Or</span>
          </div>

          <section className="option-section">
            <p className="landing-prompt">Select competition</p>
            <div className="option-list">
              {competitions.map((c) => (
                <button
                  key={c.code}
                  className="option-card"
                  type="button"
                  onClick={() => setPickedComp(c.code)}
                >
                  <span className="option-card-name">{c.name}</span>
                  <span className="option-card-arrow">›</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function playerSub(player: PlayerSearchResult): string {
  if (player.sections.length === 1) {
    const s = player.sections[0];
    return `${s.team} · ${s.sectionName}`;
  }
  return `${player.sections.length} teams / sections`;
}

function rememberSection(sectionCode: string) {
  try {
    window.localStorage?.setItem(SELECTED_SECTION_STORAGE_KEY, sectionCode);
  } catch {
    // ignore
  }
  document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=${encodeURIComponent(sectionCode)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
