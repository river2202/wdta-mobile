/**
 * Populate player_appearance from every cached section.
 * Run after deploying the player feature:
 *
 *   npm run db:backfill
 */
import { sql } from "../lib/db/index";
import { replaceSectionAppearances } from "../lib/db/queries";
import { extractAppearances } from "../lib/wdta/appearances";
import type { CachedResults } from "../lib/wdta/types";

const result = await sql<{ section_code: string; results_json: CachedResults }>`
  SELECT section_code, results_json FROM section_cache
`;

console.log(`Backfilling player appearances for ${result.rows.length} cached sections…`);

let total = 0;
for (const row of result.rows) {
  const rows = extractAppearances(row.results_json);
  await replaceSectionAppearances(row.section_code, rows);
  total += rows.length;
}

console.log(`Done. Wrote ${total} appearance rows.`);
