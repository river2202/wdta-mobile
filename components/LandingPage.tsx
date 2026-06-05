"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";

export type CompetitionOption = { code: string; name: string };
export type SectionOption = { code: string; name: string; competitionCode: string };

export function LandingPage({
  competitions,
  sections,
}: {
  competitions: CompetitionOption[];
  sections: SectionOption[];
}) {
  const router = useRouter();
  const [pickedComp, setPickedComp] = useState<string | null>(null);

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

  function pickSection(sectionCode: string) {
    rememberSection(sectionCode);
    router.push(`/results?section=${encodeURIComponent(sectionCode)}`);
  }

  const selectedComp = competitions.find((c) => c.code === pickedComp);
  const filteredSections = sections.filter((s) => s.competitionCode === pickedComp);

  return (
    <main className="landing-shell">

      {/* Always-visible compact header */}
      <header className="landing-header">
        <Image src="/tennis-mark.svg" alt="" className="brand-mark" width={40} height={40} />
        <div>
          <h1 className="landing-title">WDTA Results</h1>
          <p className="landing-tagline">Mobile-friendly layout for your team</p>
        </div>
      </header>

      {/* Selected competition band — slides in when a competition is picked */}
      {pickedComp && selectedComp && (
        <button
          key={pickedComp}
          className="comp-band"
          type="button"
          onClick={() => setPickedComp(null)}
        >
          <span className="comp-band-arrow">‹</span>
          <span className="comp-band-name">{selectedComp.name}</span>
        </button>
      )}

      {/* Competition list OR section list */}
      {!pickedComp ? (
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
      ) : (
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
      )}

    </main>
  );
}

function rememberSection(sectionCode: string) {
  try {
    window.localStorage?.setItem(SELECTED_SECTION_STORAGE_KEY, sectionCode);
  } catch {
    // ignore
  }
  document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=${encodeURIComponent(sectionCode)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
