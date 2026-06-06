import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../data/db";
import { createExpense, saveProfile, emptyProfile, seedCountryCodesIfEmpty } from "../data/repos";
import { exportAll, importAll } from "./backup";

async function clearAll() {
  await Promise.all([db.profile.clear(), db.countryCodes.clear(), db.expenses.clear(), db.images.clear(), db.reports.clear()]);
}

describe("backup round-trip", () => {
  beforeEach(clearAll);

  it("exports and re-imports identical data including image bytes", async () => {
    await saveProfile({ ...emptyProfile(), invoicePrefix: "HBEXPENSE" });
    await seedCountryCodesIfEmpty();
    const e = await createExpense(
      { date: "2026-04-19", description: "Taxi", amountVND: 921025, originalAmount: 1250, originalCurrency: "THB", exchangeRate: 759, rateSource: "xe.com +3%", country: "Thailand", accountCode: "Thailand: 1", notes: "n" },
      { mimeType: "image/png", blob: new Blob(["ORIGINAL-BYTES"], { type: "image/png" }) },
      { mimeType: "application/pdf", blob: new Blob(["BW-SCAN-BYTES"], { type: "application/pdf" }) },
    );

    const { blob, filename } = await exportAll();
    expect(filename).toMatch(/\.mqx$/);

    await clearAll();
    expect(await db.expenses.count()).toBe(0);

    const file = new File([blob], filename);
    const counts = await importAll(file);
    expect(counts.expenses).toBe(1);
    expect(counts.images).toBe(2);

    const restored = await db.expenses.get(e.id);
    expect(restored?.amountVND).toBe(921025);
    const orig = await db.images.get(e.originalImageId);
    expect(await orig!.blob.text()).toBe("ORIGINAL-BYTES");
    expect((await db.countryCodes.count())).toBe(9);
    expect((await db.profile.get("profile"))?.invoicePrefix).toBe("HBEXPENSE");
  });

  it("rejects a file that isn't a valid backup", async () => {
    const bad = new File([JSON.stringify({ hello: "world" })], "backup.zip");
    await expect(importAll(bad)).rejects.toThrow();
    // original data unchanged (still empty here)
    expect(await db.expenses.count()).toBe(0);
  });
});
