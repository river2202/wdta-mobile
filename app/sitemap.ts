import type { MetadataRoute } from "next";

import { getAllSections } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const SITE_URL = "https://wdta.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/our-story`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const sections = await getAllSections();
    for (const section of sections) {
      entries.push({
        url: `${SITE_URL}/results?section=${encodeURIComponent(section.code)}`,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // DB unavailable — serve the static entries only.
  }

  return entries;
}
