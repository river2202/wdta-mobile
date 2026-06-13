"use client";

import { useRouter } from "next/navigation";

/**
 * Header "‹ Back" control that returns to the *actual* previous page via
 * router.back(). It renders as a real anchor to `fallbackHref`, so without JS
 * (or on a direct visit / SEO landing with no in-app history) it still leads
 * somewhere useful instead of doing nothing.
 */
export function BackLink({
  fallbackHref,
  label = "Back",
  className = "player-back",
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <a
      className={className}
      href={fallbackHref}
      aria-label={`${label} to previous page`}
      onClick={(event) => {
        // Honour modifier-clicks (open in new tab) — let the browser handle them.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        // history.length > 1 means we arrived here from another page in this tab,
        // so going back lands on the real previous page. On a fresh tab / direct
        // visit (length 1) fall through to the fallback href.
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      ‹ {label}
    </a>
  );
}
