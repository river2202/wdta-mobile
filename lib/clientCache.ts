"use client";

import { useEffect } from "react";

/**
 * Tiny localStorage cache used for "cache-first" page rendering: a page's
 * presentational component writes its data here, and on the next navigation a
 * Suspense fallback reads it back to paint instantly while the server revalidates
 * in the background (stale-while-revalidate).
 *
 * All access is wrapped in try/catch and guarded for SSR — a missing/parse error
 * or unavailable storage just behaves like a cache miss.
 */

const PREFIX = "wdta-cache:";

export const cacheKeys = {
  results: (section: string) => `results:${section}`,
  team: (section: string, team: string) => `team:${section}:${team}`,
  player: (key: string) => `player:${key}`,
};

export type Cached<T> = { data: T; cachedAt: number };

export function readCache<T>(key: string): Cached<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (!parsed || typeof parsed.cachedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // Storage full / unavailable / private mode — caching is best-effort.
  }
}

/** Persist `data` under `key` whenever it changes. No-op when `key` is empty. */
export function useWriteCache<T>(key: string, data: T): void {
  useEffect(() => {
    if (key) writeCache(key, data);
  }, [key, data]);
}
