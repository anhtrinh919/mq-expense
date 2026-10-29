// Nightly SQLite copy next to the live DB, so the home PC can pull an off-host backup
// (see scripts/pull-backup.sh). Keeps the newest KEEP copies; the DB is ~300 MB.

import type Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const KEEP = 7;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Writes today's (Vietnam date) copy if missing, then prunes old ones. Returns the new file, or null. */
export function backupNow(db: Database.Database, dir: string, now = Date.now()): string | null {
  const day = new Date(now + VN_OFFSET_MS).toISOString().slice(0, 10);
  const out = join(dir, `mqx-${day}.sqlite`);
  if (existsSync(out)) return null;
  mkdirSync(dir, { recursive: true });
  db.prepare("VACUUM INTO ?").run(out);
  const old = readdirSync(dir).filter((f) => /^mqx-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort().slice(0, -KEEP);
  for (const f of old) rmSync(join(dir, f));
  return out;
}

/** Checks hourly; the first check after midnight Vietnam time makes that day's copy. */
export function startBackups(db: Database.Database, dir: string): void {
  const tick = () => {
    try {
      const out = backupNow(db, dir);
      if (out) console.log(`[backup] wrote ${out}`);
    } catch (e) {
      console.error(`[backup] failed: ${String(e)}`);
    }
  };
  tick();
  setInterval(tick, 60 * 60 * 1000).unref();
}
