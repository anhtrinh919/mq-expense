import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { loadCaptureDraft, saveCaptureDraft, clearCaptureDraft } from "./captureDraft";
import type { CaptureDraftItem } from "./types";

const item = (id: string): CaptureDraftItem => ({
  id,
  fileName: id + ".jpg",
  fileType: "image/jpeg",
  fileBlob: new Blob(["bytes-" + id], { type: "image/jpeg" }),
  status: "ready",
  bwScanMime: "application/pdf",
  bwScanData: "AAAA",
  date: "2026-04-19",
  amount: "1250",
  currency: "THB",
  country: "Thailand",
  accountCode: "Thailand: 1",
  description: "Taxi",
});

describe("capture draft", () => {
  beforeEach(async () => { await db.drafts.clear(); });

  it("persists and restores the in-progress queue incl. file bytes", async () => {
    await saveCaptureDraft({ idx: 1, items: [item("a"), item("b")] });
    const back = await loadCaptureDraft();
    expect(back?.items.length).toBe(2);
    expect(back?.idx).toBe(1);
    expect(await back!.items[0].fileBlob.text()).toBe("bytes-a");
    expect(back?.items[1].currency).toBe("THB");
    expect(back?.savedAt).toBeGreaterThan(0);
  });

  it("clears the draft on commit", async () => {
    await saveCaptureDraft({ idx: 0, items: [item("a")] });
    await clearCaptureDraft();
    expect(await loadCaptureDraft()).toBeUndefined();
  });
});
