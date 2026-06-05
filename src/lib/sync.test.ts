import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../data/db";
import { createExpense, deleteExpense } from "../data/repos";
import { saveAccount, wipeWorkspace } from "./authClient";
import { syncNow } from "./sync";

// In-memory mock of the server's sync store, with the same last-write-wins behavior.
const server = new Map<string, { store: string; recordId: string; updatedAt: number; deleted: boolean; data: unknown }>();

function mockFetch(url: string, init?: RequestInit): Promise<Response> {
  const u = new URL(url, "http://localhost");
  if (u.pathname === "/api/sync" && init?.method === "POST") {
    const { records } = JSON.parse(String(init.body)) as { records: Array<{ store: string; recordId: string; updatedAt: number; deleted?: boolean; data?: unknown }> };
    for (const r of records) {
      const key = `${r.store}:${r.recordId}`;
      const ex = server.get(key);
      if (!ex || r.updatedAt > ex.updatedAt) server.set(key, { store: r.store, recordId: r.recordId, updatedAt: r.updatedAt, deleted: !!r.deleted, data: r.data });
    }
    return jsonRes({ applied: records.length, cursor: 0 });
  }
  if (u.pathname === "/api/sync") {
    const since = Number(u.searchParams.get("since") ?? 0);
    const recs = [...server.values()].filter((r) => r.updatedAt > since).sort((a, b) => a.updatedAt - b.updatedAt);
    const cursor = recs.reduce((m, r) => Math.max(m, r.updatedAt), since);
    return jsonRes({ records: recs.map((r) => ({ store: r.store, recordId: r.recordId, updatedAt: r.updatedAt, deleted: r.deleted, data: r.deleted ? null : r.data })), cursor });
  }
  return jsonRes({}, 404);
}

function jsonRes(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

function blob(text: string): Blob {
  return new Blob([text], { type: "image/png" });
}

beforeEach(async () => {
  server.clear();
  vi.stubGlobal("fetch", vi.fn(mockFetch));
  await wipeWorkspace();
  await saveAccount({ accountId: "acc1", email: "a@x.test", name: "A", role: "peer", sessionToken: "tok", pullCursor: 0, pushHigh: 0 });
});

describe("sync round-trip", () => {
  it("pushes an expense + images to the server and pulls them back onto a fresh device", async () => {
    const exp = await createExpense(
      { date: "2026-06-01", description: "taxi", amountVND: 120000, originalAmount: null, originalCurrency: null, exchangeRate: null, rateSource: "", country: "Vietnam", accountCode: "VN", notes: "" } as never,
      { mimeType: "image/png", blob: blob("ORIGINAL") },
      { mimeType: "image/png", blob: blob("BWSCAN") },
    );
    await syncNow(); // push to server, then pull (no-op)
    expect(server.has(`expenses:${exp.id}`)).toBe(true);
    expect([...server.keys()].filter((k) => k.startsWith("images:")).length).toBe(2);

    // Simulate a second device: wipe local, reset the pull cursor, pull everything.
    await wipeWorkspace();
    await saveAccount({ pullCursor: 0, pushHigh: 0 });
    expect(await db.expenses.count()).toBe(0);
    await syncNow();

    const restored = await db.expenses.get(exp.id);
    expect(restored?.description).toBe("taxi");
    const img = await db.images.get(exp.originalImageId);
    expect(img && (await img.blob.text())).toBe("ORIGINAL");
  });

  it("propagates a delete as a tombstone", async () => {
    const exp = await createExpense(
      { date: "2026-06-02", description: "lunch", amountVND: 50000, originalAmount: null, originalCurrency: null, exchangeRate: null, rateSource: "", country: "Vietnam", accountCode: "VN", notes: "" } as never,
      { mimeType: "image/png", blob: blob("o") },
      { mimeType: "image/png", blob: blob("b") },
    );
    await syncNow();
    await deleteExpense(exp.id);
    await syncNow(); // push tombstone

    // Fresh device that had the expense pulls the tombstone and removes it.
    await wipeWorkspace();
    await saveAccount({ pullCursor: 0, pushHigh: 0 });
    await syncNow();
    expect(await db.expenses.get(exp.id)).toBeUndefined();
  });
});
