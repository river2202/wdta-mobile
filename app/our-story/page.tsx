import type { Metadata } from "next";

import { BackLink } from "@/components/BackLink";
import { CoffeeIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Why this mobile-friendly results site for the Waverley & District Tennis Association (WDTA) exists: a non-profit, parent-volunteer project.",
  alternates: { canonical: "/our-story" },
};

const BUY_ME_A_COFFEE_URL = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;
const ADMIN_EMAIL = "admin@wdta.app";

export default function OurStoryPage() {
  return (
    <main className="page-shell story-shell">
      <header className="player-header">
        <BackLink fallbackHref="/" />
        <p className="eyebrow">Our Story</p>
        <div className="story-title-row">
          <h1>Built by a parent, for parents</h1>
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
      </header>

      <section className="story-block">
        <h2>Why this site exists</h2>
        <p>
          The official WDTA results site was built long before smartphones, and reading it
          courtside on a phone is hard work. A tennis parent used AI tools to re-present the
          same public results in a mobile-first layout — inspired by another tennis dad who had
          AI load the whole season&apos;s fixtures into his calendar. AI can make small things
          like this much easier; this site tries to bring that convenience to every family in
          the association.
        </p>
      </section>

      <section className="story-block">
        <h2>What it does</h2>
        <ul className="story-list">
          <li>Covers every competition and section — pick yours once and it remembers</li>
          <li>Search by player name, or browse by section</li>
          <li>Ladder and round-by-round results with full match details</li>
          <li>Player pages with team and match history</li>
          <li>Refreshes daily, with links back to the original WDTA pages</li>
        </ul>
      </section>

      <section className="story-block">
        <h2>A non-profit, volunteer project</h2>
        <p>
          Free to use — no ads, no accounts, no tracking. Built and run by volunteer parents,
          with the running costs coming out of their own pockets. If the site saves you time
          on a Saturday morning, you can buy the volunteers a coffee — every donation goes
          straight to keeping the site running.
        </p>
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
      </section>

      <section className="story-block">
        <h2>Disclaimer</h2>
        <p>
          This is an unofficial volunteer project, not affiliated with or endorsed by WDTA,
          Waverley Tennis, or TROLS. Results are parsed automatically from the public WDTA
          pages and may be delayed, incomplete, or contain errors — the original WDTA site
          remains the authoritative record. Use at your own risk.
        </p>
      </section>

      <section className="story-block">
        <h2>Get in touch</h2>
        <p>
          Suggestions, corrections, and ideas from parents are very welcome. And if you have a
          similar idea you&apos;d like to make real, reach out — happy to talk it through.
        </p>
        <a className="story-mail" href={`mailto:${ADMIN_EMAIL}`}>
          {ADMIN_EMAIL}
        </a>
      </section>
    </main>
  );
}
