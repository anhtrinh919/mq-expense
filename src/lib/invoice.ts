import type { ExpenseReport } from "../data/types";

// Invoice numbering, preserved from generate_report.py and made editable per the design.
// Format: {prefix}{YY}-{n}  e.g. HBEXPENSE26-1
// YY = two-digit year of the generation date; n resets to 1 each new year.

const RE = /^(.*?)(\d{2})-(\d+)$/; // prefix, YY, n  (prefix may itself end in digits, captured greedily-min)

/** Suggests the next invoice number for the given generation date, based on prior reports. */
export function suggestInvoiceNumber(reports: ExpenseReport[], prefix: string, isoDate: string): string {
  const yy = isoDate.slice(2, 4); // "2026" -> "26"
  const p = (prefix || "INV").trim();
  let maxN = 0;
  for (const r of reports) {
    const m = RE.exec(r.invoiceNumber.trim());
    if (m && m[2] === yy) {
      const n = Number(m[3]);
      if (n > maxN) maxN = n;
    }
  }
  return `${p}${yy}-${maxN + 1}`;
}
