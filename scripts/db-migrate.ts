/**
 * One-time database migration script.
 * Run after creating a Vercel Postgres database:
 *
 *   npm run db:migrate
 */
import { runMigrations } from "../lib/db/index";

console.log("Running database migrations…");
await runMigrations();
console.log("Done.");
