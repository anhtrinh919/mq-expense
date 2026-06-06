import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import {
  seedCountryCodesIfEmpty, listCountryCodes, getProfile, saveProfile, emptyProfile,
  createExpense, listExpenses, deleteExpense, getImageById,
  saveReport, markReportPaid, deleteReport,
} from "./repos";
import type { ExpenseReport } from "./types";

const blob = (s: string) => new Blob([s], { type: "image/png" });

async function clearAll() {
  await Promise.all([db.profile.clear(), db.countryCodes.clear(), db.expenses.clear(), db.images.clear(), db.reports.clear()]);
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

  it("seeds SEA country codes only when empty", async () => {
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
});
