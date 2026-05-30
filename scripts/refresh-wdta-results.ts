import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchCachedResults } from "../lib/wdta/fetch";

const outputPath = path.join(process.cwd(), "data", "wdta-results.json");

const results = await fetchCachedResults();

if (results.sections.length !== 2) {
  throw new Error(`Expected 2 sections, parsed ${results.sections.length}`);
}

for (const section of results.sections) {
  if (!section.sectionName || section.rounds.length === 0) {
    throw new Error(`Parsed invalid section cache for ${section.sectionCode}`);
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${results.sections.length} sections to ${path.relative(process.cwd(), outputPath)}`,
);

