import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";

process.env.MQX_DB_PATH = ":memory:";
const { PULL_PAGE_SQL } = await import("./sync.ts");

function pageOf(db: Database.Database, since: number, skip: number): number[] {
  return (db.prepare(PULL_PAGE_SQL).all({ acc: "a", since, skip }) as { updated_at: number }[]).map((r) => r.updated_at);
}

describe("pull paging", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE sync_records (account_id TEXT, store TEXT, record_id TEXT, data BLOB, updated_at INTEGER, deleted INTEGER)");
  const add = db.prepare("INSERT INTO sync_records VALUES (?, 'expenses', ?, NULL, ?, 0)");
  // Timestamps 1,2,3,3,3,4,5 for account a; one row for another account.
  [1, 2, 3, 3, 3, 4, 5].forEach((t, i) => add.run("a", `r${i}`, t));
  add.run("b", "x", 2);

  it("returns a page of 3, plus rows sharing the last timestamp", () => {
    expect(pageOf(db, 0, 2)).toEqual([1, 2, 3, 3, 3]);
  });
  it("continues after the cursor", () => {
    expect(pageOf(db, 3, 2)).toEqual([4, 5]);
  });
  it("returns everything left when fewer than a page remain", () => {
    expect(pageOf(db, 4, 2)).toEqual([5]);
    expect(pageOf(db, 5, 2)).toEqual([]);
  });
});
