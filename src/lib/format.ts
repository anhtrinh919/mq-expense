// Formatting helpers. Money is always whole-VND with the ₫ symbol and grouped thousands.

const VND = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function vnd(n: number): string {
  return `₫${VND.format(Math.round(n))}`;
}

export function plainVnd(n: number): string {
  return VND.format(Math.round(n));
}

export function num(n: number, maxFrac = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFrac }).format(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04-19" -> "19 Apr 2026" */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "2026-04-19" -> "19 Apr" */
export function fmtDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
}

/** Builds the period label used on the invoice, e.g. "Jan 2026 - Mar 2026" or "Mar 2026". */
export function periodLabel(start: string, end: string): string {
  const a = monthYear(start);
  const b = monthYear(end);
  return a === b ? a : `${a} - ${b}`;
}

function monthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
