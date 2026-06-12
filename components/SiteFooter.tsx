import Link from "next/link";

/** Shared footer: Our Story link + non-profit note. */
export function SiteFooter() {
  return (
    <footer className="page-footer">
      <Link className="footer-story-link" href="/our-story">
        Our Story
      </Link>
      <p className="footer-note">
        Unofficial results viewer for the Waverley &amp; District Tennis Association (WDTA)
        <br />A non-profit, parent-volunteer project · not affiliated with WDTA/TROLS
      </p>
    </footer>
  );
}
