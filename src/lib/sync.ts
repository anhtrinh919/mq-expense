// Background sync. The server holds an encrypted, per-account copy of the five synced
// stores; this pushes local changes and pulls remote ones, merging with last-write-wins
// by updatedAt and honoring delete tombstones. Blobs (receipt images, report files) are
// base64-encoded in transit, like the .mqx backup.

import { db, withSuppressedStamp } from "../data/db";
import type { Table } from "dexie";
import { getAccount, saveAccount, isAuthenticated } from "./authClient";
import { blobToBase64, base64ToBlob, authHeaders } from "./api";

type SyncStore = "expenses" | "images" | "reports" | "profile" | "countryCodes";
const STORES: SyncStore[] = ["profile", "countryCodes", "expenses", "images", "reports"];

function table(store: SyncStore): Table<Record<string, unknown>, string> {
  return (db as unknown as Record<string, Table<Record<string, unknown>, string>>)[store];
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function encode(store: SyncStore, row: Record<string, unknown>): Promise<unknown> {
  if (store === "images") {
    const { blob, ...rest } = row as { blob: Blob };
    return { ...rest, blobBase64: await blobToBase64(blob) };
  }
  if (store === "reports") {
    const { combinedPdf, expenseXlsx, ...rest } = row as { combinedPdf: Blob | null; expenseXlsx: Blob | null };
    return {
      ...rest,
      combinedPdfB64: combinedPdf ? await blobToBase64(combinedPdf) : null,
      expenseXlsxB64: expenseXlsx ? await blobToBase64(expenseXlsx) : null,
    };
  }
  return row;
}

function decode(store: SyncStore, data: Record<string, unknown>): Record<string, unknown> {
  if (store === "images") {
    const { blobBase64, ...rest } = data as { blobBase64: string; mimeType: string };
    return { ...rest, blob: base64ToBlob(blobBase64, rest.mimeType) };
  }
  if (store === "reports") {
    const { combinedPdfB64, expenseXlsxB64, ...rest } = data as {
      combinedPdfB64: string | null;
      expenseXlsxB64: string | null;
    };
    return {
      ...rest,
      combinedPdf: combinedPdfB64 ? base64ToBlob(combinedPdfB64, "application/pdf") : null,
      expenseXlsx: expenseXlsxB64 ? base64ToBlob(expenseXlsxB64, XLSX_MIME) : null,
    };
  }
  return data;
}

interface WireRecord {
  store: string;
  recordId: string;
  updatedAt: number;
  deleted?: boolean;
  data?: unknown;
}

let syncing = false;
let pending = false;

/** Push local changes, then pull remote ones. Safe to call often; coalesces concurrent calls. */
export async function syncNow(): Promise<void> {
  const account = await getAccount();
  if (!isAuthenticated(account)) return;
  if (syncing) {
    pending = true;
    return;
  }
  syncing = true;
  try {
    await push();
    await pull();
  } catch (e) {
    // Network/offline: leave cursors as-is and try again next tick.
    console.warn("[sync] failed, will retry", e);
  } finally {
    syncing = false;
    if (pending) {
      pending = false;
      void syncNow();
    }
  }
}

async function push(): Promise<void> {
  const account = await getAccount();
  const since = account.pushHigh;
  let high = since;
  const records: WireRecord[] = [];

  for (const store of STORES) {
    const rows = (await table(store)
      .where("updatedAt")
      .above(since)
      .toArray()) as Record<string, unknown>[];
    for (const row of rows) {
      const updatedAt = Number(row.updatedAt ?? 0);
      records.push({ store, recordId: String(row.id), updatedAt, deleted: false, data: await encode(store, row) });
      if (updatedAt > high) high = updatedAt;
    }
  }
  const tombs = await db.tombstones.where("deletedAt").above(since).toArray();
  for (const t of tombs) {
    records.push({ store: t.store, recordId: t.recordId, updatedAt: t.deletedAt, deleted: true });
    if (t.deletedAt > high) high = t.deletedAt;
  }

  if (records.length === 0) return;
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`push failed ${res.status}`);
  await saveAccount({ pushHigh: high });
}

async function pull(): Promise<void> {
  const account = await getAccount();
  const res = await fetch(`/api/sync?since=${account.pullCursor}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`pull failed ${res.status}`);
  const body = (await res.json()) as { records: WireRecord[]; cursor: number };

  let maxApplied = account.pushHigh;
  for (const rec of body.records) {
    const store = rec.store as SyncStore;
    const tbl = table(store);
    if (rec.deleted) {
      await tbl.delete(rec.recordId); // direct delete — no new tombstone (avoids echo)
      continue;
    }
    const local = (await tbl.get(rec.recordId)) as { updatedAt?: number } | undefined;
    if (!local || (local.updatedAt ?? 0) < rec.updatedAt) {
      const row = decode(store, rec.data as Record<string, unknown>);
      row.updatedAt = rec.updatedAt;
      await withSuppressedStamp(() => tbl.put(row));
    }
    if (rec.updatedAt > maxApplied) maxApplied = rec.updatedAt;
  }
  // Advance cursors. pushHigh moves past applied remote writes so we don't echo them back.
  await saveAccount({ pullCursor: body.cursor, pushHigh: maxApplied });
}

/** True if there is anything local to push (used to decide first-login migration). */
export async function hasLocalData(): Promise<boolean> {
  const [e, p] = await Promise.all([db.expenses.count(), db.profile.get("profile")]);
  return e > 0 || (!!p && p.onboardingComplete === true);
}
