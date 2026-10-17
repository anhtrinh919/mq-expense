import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import {
  seedCountryCodesIfEmpty, listCountryCodes, dedupeCountryCodes, upsertCountryCode, getProfile, saveProfile, emptyProfile,
  createExpense, listExpenses, deleteExpense, getImageById,
  saveReport, markReportPaid, deleteReport,
} from "./repos";
import type { ExpenseReport } from "./types";

const blob = (s: string) => new Blob([s], { type: "image/png" });

async function clearAll() {
  await Promise.all([db.profile.clear(), db.countryCodes.clear(), db.expenses.clear(), db.images.clear(), db.reports.clear(), db.tombstones.clear()]);
}

async function addExpense(date: string, country = "Vietnam") {
  return createExpense(
    { date, description: "x " + date, amountVND: 100000, originalAmount: null, originalCurrency: "VND", exchangeRate: null, rateSource: "", country, accountCode: country + ": 1", notes: "" },
    { mimeType: "image/png", blob: blob("orig" + date) },
    { mimeType: "image/png", blob: blob("bw" + date) },
  );
}

describe("repos", () => {
  beforeEach(clearAll);

  it("seeds 9 SEA country codes only when empty", async () => {
    expect(await seedCountryCodesIfEmpty()).toBe(true);
    expect((await listCountryCodes()).length).toBe(9);
    expect(await seedCountryCodesIfEmpty()).toBe(false); // no double-seed
    expect((await listCountryCodes()).length).toBe(9);
  });

  it("saves and reloads the profile singleton incl. base currency + onboarding fields", async () => {
    const p = { ...emptyProfile(), invoicePrefix: "HBEXPENSE", vendorId: "139927", baseCurrency: "THB", homeCountry: "Thailand", onboardingComplete: true };
    await saveProfile(p);
    const back = await getProfile();
    expect(back.invoicePrefix).toBe("HBEXPENSE");
    expect(back.baseCurrency).toBe("THB");
    expect(back.homeCountry).toBe("Thailand");
    expect(back.onboardingComplete).toBe(true);
    expect(back.updatedAt).toBeGreaterThan(0);
  });

  it("a fresh profile starts not-onboarded with VND default", () => {
    const p = emptyProfile();
    expect(p.onboardingComplete).toBe(false);
    expect(p.baseCurrency).toBe("VND");
    expect(p.pinHash).toBeNull();
  });

  it("records the profile's base currency on a new expense", async () => {
    await saveProfile({ ...emptyProfile(), baseCurrency: "THB" });
    const e = await addExpense("2026-04-19");
    expect(e.baseCurrency).toBe("THB");
  });

  it("creates an expense with both images and round-trips them", async () => {
    const e = await addExpense("2026-04-19");
    expect(e.status).toBe("pending");
    const orig = await getImageById(e.originalImageId);
    const bw = await getImageById(e.bwScanId);
    expect(await orig!.blob.text()).toBe("orig2026-04-19");
    expect(await bw!.blob.text()).toBe("bw2026-04-19");
  });

  it("filters by date range, country, and status", async () => {
    await addExpense("2026-01-05", "Vietnam");
    await addExpense("2026-03-20", "Thailand");
    expect((await listExpenses({ start: "2026-03-01", end: "2026-03-31" })).length).toBe(1);
    expect((await listExpenses({ country: "Vietnam" })).length).toBe(1);
    expect((await listExpenses({ status: "pending" })).length).toBe(2);
  });

  it("deletes an expense and its images", async () => {
    const e = await addExpense("2026-04-19");
    await deleteExpense(e.id);
    expect(await getImageById(e.originalImageId)).toBeUndefined();
    expect((await listExpenses()).length).toBe(0);
  });

  it("marks expenses submitted on report save and unlocks them on delete", async () => {
    const e = await addExpense("2026-04-19");
    const report: ExpenseReport = { id: "rep1", invoiceNumber: "HBEXPENSE26-1", periodStart: "2026-04-19", periodEnd: "2026-04-19", periodLabel: "Apr 2026", totalVND: 100000, expenseIds: [e.id], status: "generated", generatedAt: Date.now(), paidAt: null, combinedPdf: null, expenseXlsx: null };
    await saveReport(report);
    expect((await listExpenses({ status: "submitted" })).length).toBe(1);

    await deleteReport("rep1"); // not paid → returns expense to pool
    const after = await listExpenses({ status: "pending" });
    expect(after.length).toBe(1);
    expect(after[0].invoiceNumber).toBeNull();
  });

  it("does not delete a paid report", async () => {
    const e = await addExpense("2026-04-19");
    await saveReport({ id: "rep2", invoiceNumber: "HBEXPENSE26-2", periodStart: e.date, periodEnd: e.date, periodLabel: "Apr 2026", totalVND: 100000, expenseIds: [e.id], status: "generated", generatedAt: Date.now(), paidAt: null, combinedPdf: null, expenseXlsx: null });
    await markReportPaid("rep2");
    await deleteReport("rep2"); // should be a no-op for paid reports
    expect(await db.reports.get("rep2")).toBeTruthy();
  });

  it("seeds the same fixed ids on every device", async () => {
    await seedCountryCodesIfEmpty();
    const first = (await listCountryCodes()).map((c) => c.id);
    await clearAll();
    await seedCountryCodesIfEmpty();
    expect((await listCountryCodes()).map((c) => c.id)).toEqual(first);
  });

  it("stamps default codes as oldest, so any real edit wins sync", async () => {
    await seedCountryCodesIfEmpty();
    expect((await listCountryCodes()).every((c) => c.updatedAt === 1)).toBe(true);
  });

  it("stamps the current time when a code is saved, even one re-added after a delete", async () => {
    const before = Date.now();
    await upsertCountryCode({ id: "cc_x", country: "Vietnam", accountCode: "8741/4105", sortOrder: 0, updatedAt: 5 });
    expect((await db.countryCodes.get("cc_x"))!.updatedAt!).toBeGreaterThanOrEqual(before);
  });

  it("dedupes doubled country codes, keeping the smallest id, and syncs the deletes", async () => {
    const pairs: Array<[string, string]> = [
      ["Cambodia", "8741/4109"], ["Indonesia", "8741/4104"], ["Malaysia", "8741/4102"],
      ["Myanmar", "8741/4108"], ["Philippines", "8741/4106"], ["Singapore", "8741/4107"],
      ["Thailand", "8741/4103"], ["Vietnam", "8741/4105"], ["SEA Head Office & Others", "8741/4101"],
    ];
    // two devices' worth of seeds with random-looking ids; device B's copy differs only in case/space
    await db.countryCodes.bulkPut(pairs.map(([country, accountCode], i) => ({ id: `cc_a${i}`, country, accountCode, sortOrder: i })));
    await db.countryCodes.bulkPut(pairs.map(([country, accountCode], i) => ({ id: `cc_b${i}`, country: ` ${country.toUpperCase()} `, accountCode, sortOrder: i })));
    // a user-edited copy is a different entry and must survive
    await db.countryCodes.put({ id: "cc_c0", country: "Vietnam", accountCode: "8741/9999", sortOrder: 9 });
    // two blank rows being filled in are not repeats
    await db.countryCodes.bulkPut([{ id: "cc_d0", country: "", accountCode: "", sortOrder: 10 }, { id: "cc_d1", country: "", accountCode: "", sortOrder: 11 }]);

    expect(await dedupeCountryCodes()).toBe(9);
    const left = await listCountryCodes();
    expect(left).toHaveLength(12);
    expect(left.filter((c) => c.id.startsWith("cc_b"))).toHaveLength(0);
    expect(left.some((c) => c.id === "cc_c0")).toBe(true);
    const tombs = await db.tombstones.toArray();
    expect(tombs.map((t) => t.recordId).sort()).toEqual(pairs.map((_, i) => `cc_b${i}`).sort());
    expect(tombs.every((t) => t.store === "countryCodes")).toBe(true);

    expect(await dedupeCountryCodes()).toBe(0); // idempotent
  });
});
