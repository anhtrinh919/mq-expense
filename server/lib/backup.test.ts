import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupNow } from "./backup.ts";

describe("backupNow", () => {
  it("names the copy by Vietnam date, skips a second run, and keeps the newest 7", () => {
    const dir = mkdtempSync(join(tmpdir(), "mqx-backup-"));
    for (let d = 1; d <= 8; d++) writeFileSync(join(dir, `mqx-2026-10-0${d}.sqlite`), "");
    const db = new Database(":memory:");
    db.exec("CREATE TABLE t (x); INSERT INTO t VALUES (1)");

    // 2026-10-28 18:00 UTC is already 2026-10-29 in Vietnam
    const now = Date.UTC(2026, 9, 28, 18);
    expect(backupNow(db, dir, now)).toBe(join(dir, "mqx-2026-10-29.sqlite"));
    expect(backupNow(db, dir, now)).toBeNull();

    const left = readdirSync(dir).sort();
    expect(left).toHaveLength(7);
    expect(left[0]).toBe("mqx-2026-10-03.sqlite");
    expect(new Database(join(dir, "mqx-2026-10-29.sqlite")).prepare("SELECT x FROM t").get()).toEqual({ x: 1 });
  });
});
