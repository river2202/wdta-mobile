"use client";

import Link from "next/link";
import { useEffect } from "react";

const SELECTED_SECTION_STORAGE_KEY = "wdta-mobile-section";

/**
 * Shown when /results cannot load a section. It clears the saved selection so
 * the home page stops auto-redirecting back here (which would otherwise create
 * an infinite redirect loop), and offers a manual way to pick again.
 */
export function SectionLoadError() {
  useEffect(() => {
    try {
      window.localStorage?.removeItem(SELECTED_SECTION_STORAGE_KEY);
    } catch {
      // ignore
    }
    document.cookie = `${SELECTED_SECTION_STORAGE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  }, []);

  return (
    <main className="page-shell">
      <section className="empty-state">
        <h2>Couldn&apos;t load that section</h2>
        <p>
          The results may be temporarily unavailable. Your saved selection has been
          cleared — please choose your section again.
        </p>
        <Link className="recover-link" href="/?change=1">
          Choose your section
        </Link>
      </section>
    </main>
  );
}
