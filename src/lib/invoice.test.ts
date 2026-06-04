import { describe, it, expect } from "vitest";
import { suggestInvoiceNumber } from "./invoice";
import type { ExpenseReport } from "../data/types";

function rep(invoiceNumber: string): ExpenseReport {
  return { id: invoiceNumber, invoiceNumber, periodStart: "", periodEnd: "", periodLabel: "", totalVND: 0, expenseIds: [], status: "generated", generatedAt: 0, paidAt: null, combinedPdf: null, expenseXlsx: null };
}

describe("suggestInvoiceNumber", () => {
  it("starts at 1 for a year with no reports", () => {
    expect(suggestInvoiceNumber([], "HBEXPENSE", "2026-06-04")).toBe("HBEXPENSE26-1");
  });

  it("increments within the same year", () => {
    const reports = [rep("HBEXPENSE26-1"), rep("HBEXPENSE26-2")];
    expect(suggestInvoiceNumber(reports, "HBEXPENSE", "2026-06-04")).toBe("HBEXPENSE26-3");
  });

  it("resets to 1 in a new year", () => {
    const reports = [rep("HBEXPENSE25-6")];
    expect(suggestInvoiceNumber(reports, "HBEXPENSE", "2026-01-10")).toBe("HBEXPENSE26-1");
  });

  it("ignores other years when finding the max", () => {
    const reports = [rep("HBEXPENSE25-9"), rep("HBEXPENSE26-2"), rep("HBEXPENSE24-3")];
    expect(suggestInvoiceNumber(reports, "HBEXPENSE", "2026-12-31")).toBe("HBEXPENSE26-3");
  });

  it("falls back to INV when no prefix is set", () => {
    expect(suggestInvoiceNumber([], "", "2026-06-04")).toBe("INV26-1");
  });
});
