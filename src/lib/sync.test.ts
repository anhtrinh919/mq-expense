import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../data/db";
import { createExpense, deleteExpense } from "../data/repos";
import { getAccount, saveAccount, wipeWorkspace } from "./authClient";
import { syncNow, onSessionEnded } from "./sync";

// In-memory mock of the server's sync store, with the same last-write-wins behavior.
const server = new Map<string, { store: string; recordId: string; updatedAt: number; deleted: boolean; data: unknown }>();

let pageSize = 0; // 0 = send everything in one pull

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
    // Like the real server: a page of pageSize, plus records sharing the last timestamp.
    const last = recs[pageSize - 1]?.updatedAt;
    const page = pageSize && last !== undefined ? recs.filter((r) => r.updatedAt <= last) : recs;
    const cursor = page.reduce((m, r) => Math.max(m, r.updatedAt), since);
    return jsonRes({ more: page.length < recs.length, records: page.map((r) => ({ store: r.store, recordId: r.recordId, updatedAt: r.updatedAt, deleted: r.deleted, data: r.deleted ? null : r.data })), cursor });
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
  pageSize = 0;
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

describe("ended login", () => {
  it("drops the session token, keeps local data, and tells the app", async () => {
    await createExpense(
      { date: "2026-06-01", description: "taxi", amountVND: 1, originalAmount: null, originalCurrency: null, exchangeRate: null, rateSource: "", country: "Vietnam", accountCode: "VN", notes: "" } as never,
      { mimeType: "image/png", blob: blob("O") },
      { mimeType: "image/png", blob: blob("B") },
    );
    vi.stubGlobal("fetch", vi.fn(() => jsonRes({ error: "session expired" }, 401)));
    const told = vi.fn();
    const off = onSessionEnded(told);
    await syncNow();
    off();
    expect(told).toHaveBeenCalledOnce();
    expect((await getAccount()).sessionToken).toBeNull();
    expect(await db.expenses.count()).toBe(1);
  });
});

describe("first download on a new device", () => {
  async function seedServerThenFreshDevice() {
    for (const d of ["a", "b", "c"]) {
      await createExpense(
        { date: "2026-06-01", description: d, amountVND: 1, originalAmount: null, originalCurrency: null, exchangeRate: null, rateSource: "", country: "Vietnam", accountCode: "VN", notes: "" } as never,
        { mimeType: "image/png", blob: blob("O") },
        { mimeType: "image/png", blob: blob("B") },
      );
      await new Promise((r) => setTimeout(r, 2)); // distinct timestamps
    }
    await syncNow();
    await wipeWorkspace();
    await saveAccount({ pullCursor: 0, pushHigh: 0 });
  }

  it("keeps asking until the server has sent every page", async () => {
    await seedServerThenFreshDevice();
    pageSize = 2;
    expect(await syncNow()).toBe(true);
    expect(await db.expenses.count()).toBe(3);
    expect(await db.images.count()).toBe(6);
  });

  it("a second caller waits for a sync that has the data, not an empty early return", async () => {
    await seedServerThenFreshDevice();
    const first = syncNow();
    const second = syncNow(); // e.g. the login screen, while the background sync runs
    expect(await second).toBe(true);
    expect(await db.expenses.count()).toBe(3);
    await first;
  });

  it("reports a failed download", async () => {
    await seedServerThenFreshDevice();
    vi.stubGlobal("fetch", vi.fn(() => jsonRes({}, 502)));
    expect(await syncNow()).toBe(false);
  });
});
