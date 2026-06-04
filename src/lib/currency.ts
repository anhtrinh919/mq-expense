// Currency conversion — mirrors the original cowork pipeline:
// VND = round( originalAmount × xeRate × (1 + markupPct/100) )

export function effectiveRate(xeRate: number, markupPct: number): number {
  return xeRate * (1 + markupPct / 100);
}

export function toVND(originalAmount: number, xeRate: number, markupPct: number): number {
  return Math.round(originalAmount * effectiveRate(xeRate, markupPct));
}

/** The Notes conversion string, matching add_expense.py exactly:
 *  "1,250.00 THB × 759 = 921,025 VND [xe.com +3%]"
 *  baseCurrency is the user's reimbursement currency (VND for the original pipeline). */
export function conversionNote(
  originalAmount: number,
  originalCurrency: string,
  effRate: number,
  amountBase: number,
  markupPct: number,
  baseCurrency = "VND",
): string {
  const n2 = (x: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
  const n0 = (x: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(x);
  return `${n2(originalAmount)} ${originalCurrency} × ${n0(effRate)} = ${n0(amountBase)} ${baseCurrency} [xe.com +${markupPct}%]`;
}

export function rateSource(markupPct: number): string {
  return `xe.com +${markupPct}%`;
}
