import { Router } from "express";
import { db } from "../db/sqlite.ts";
import { type AuthedRequest } from "../lib/auth.ts";
import { unwrapDek, encryptRecord, decryptRecord } from "../lib/crypto.ts";
import { notifyAccount } from "./events.ts";

// The five client stores that sync. Drafts are transient and never sync.
const STORES = new Set(["expenses", "images", "reports", "profile", "countryCodes"]);

interface SyncRow {
  store: string;
  record_id: string;
  data: Buffer | null;
  updated_at: number;
  deleted: number;
}

interface IncomingRecord {
  store: string;
  recordId: string;
  updatedAt: number;
  deleted?: boolean;
  data?: unknown;
}

export const syncRouter = Router();

/** Pull every record for this account changed after the cursor. */
syncRouter.get("/sync", (req, res) => {
  const account = (req as AuthedRequest).account;
  const since = Number(req.query.since ?? 0) || 0;
  const dek = unwrapDek(account.enc_dek);

  const rows = db
    .prepare(
      "SELECT store, record_id, data, updated_at, deleted FROM sync_records WHERE account_id = ? AND updated_at > ? ORDER BY updated_at ASC",
    )
    .all(account.id, since) as SyncRow[];

  let cursor = since;
  const records = rows.map((r) => {
    if (r.updated_at > cursor) cursor = r.updated_at;
    return {
      store: r.store,
      recordId: r.record_id,
      updatedAt: r.updated_at,
      deleted: !!r.deleted,
      data: r.deleted || !r.data ? null : JSON.parse(decryptRecord(r.data, dek)),
    };
  });

  res.json({ records, cursor });
});

/** Push local changes. Last-write-wins per (store, recordId) by updatedAt. */
syncRouter.post("/sync", (req, res) => {
  const account = (req as AuthedRequest).account;
  const incoming = (req.body?.records ?? []) as unknown;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: "records must be an array" });

  const dek = unwrapDek(account.enc_dek);
  const upsert = db.prepare(
    `INSERT INTO sync_records (account_id, store, record_id, data, updated_at, deleted)
     VALUES (@account_id, @store, @record_id, @data, @updated_at, @deleted)
     ON CONFLICT(account_id, store, record_id) DO UPDATE SET
       data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted
     WHERE excluded.updated_at > sync_records.updated_at`,
  );

  let applied = 0;
  let cursor = 0;
  const apply = db.transaction((recs: IncomingRecord[]) => {
    for (const rec of recs) {
      if (!rec || typeof rec.recordId !== "string" || !STORES.has(rec.store) || typeof rec.updatedAt !== "number") {
        throw new BadRecord();
      }
      const deleted = rec.deleted ? 1 : 0;
      const data = deleted ? null : encryptRecord(JSON.stringify(rec.data ?? null), dek);
      const info = upsert.run({
        account_id: account.id,
        store: rec.store,
        record_id: rec.recordId,
        data,
        updated_at: rec.updatedAt,
        deleted,
      });
      if (info.changes > 0) applied++;
      if (rec.updatedAt > cursor) cursor = rec.updatedAt;
    }
  });

  try {
    apply(incoming as IncomingRecord[]);
  } catch (e) {
    if (e instanceof BadRecord) return res.status(400).json({ error: "malformed record in batch" });
    throw e;
  }
  // Nudge this account's other devices to pull the changes we just stored.
  if (applied > 0) notifyAccount(account.id);
  res.json({ applied, cursor });
});

class BadRecord extends Error {}
