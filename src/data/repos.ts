import { db, uid } from "./db";
import type {
  Profile,
  CountryCode,
  Expense,
  StoredImage,
  ExpenseReport,
  ImageKind,
} from "./types";

// ---------- Profile (singleton) ----------

export function emptyProfile(): Profile {
  return {
    id: "profile",
    invoicePrefix: "",
    vendorId: "",
    submitter: { name: "", email: "", jobTitle: "", phone: "", addressLine1: "", addressLine2: "", country: "" },
    invoiceTo: { name: "Macquarie University", address: "", email: "" },
    bank: { accountName: "", accountNumber: "", swift: "", bankName: "" },
    currencyMarkupPct: 3,
    baseCurrency: "VND",
    homeCountry: "",
    pinHash: null,
    onboardingComplete: false,
    updatedAt: 0,
  };
}

export async function getProfile(): Promise<Profile> {
  const p = await db.profile.get("profile");
  return p ?? emptyProfile();
}

export async function saveProfile(p: Profile): Promise<void> {
  await db.profile.put({ ...p, id: "profile", updatedAt: Date.now() });
}

/** Fields the Macquarie invoice header needs. Used to gate report generation. */
export function profileGaps(p: Profile): string[] {
  const gaps: string[] = [];
  if (!p.submitter.name.trim()) gaps.push("Your full name");
  if (!p.submitter.addressLine1.trim()) gaps.push("Your address");
  if (!p.invoiceTo.name.trim()) gaps.push("Invoice recipient");
  if (!p.bank.accountName.trim()) gaps.push("Bank account name");
  if (!p.bank.accountNumber.trim()) gaps.push("Bank account number");
  return gaps;
}

export function isProfileComplete(p: Profile): boolean {
  return profileGaps(p).length === 0;
}

// ---------- Country codes ----------

const SEED_CODES: Array<Omit<CountryCode, "id">> = [
  { country: "Vietnam", accountCode: "Vietnam: 8741-4105", sortOrder: 0 },
  { country: "Thailand", accountCode: "Thailand: 8741-4103", sortOrder: 1 },
  { country: "Cambodia", accountCode: "Cambodia: 8741-4109", sortOrder: 2 },
  { country: "Myanmar", accountCode: "Myanmar: 8741-4108", sortOrder: 3 },
  { country: "Australia", accountCode: "Australia: 8741-XXXX", sortOrder: 4 },
];

/** Seeds the SEA example codes on first run (only when none exist). Returns true if it seeded. */
export async function seedCountryCodesIfEmpty(): Promise<boolean> {
  const count = await db.countryCodes.count();
  if (count > 0) return false;
  await db.countryCodes.bulkPut(SEED_CODES.map((c) => ({ ...c, id: uid("cc_") })));
  return true;
}

export async function listCountryCodes(): Promise<CountryCode[]> {
  const all = await db.countryCodes.toArray();
  return all.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertCountryCode(c: CountryCode): Promise<void> {
  await db.countryCodes.put(c);
}

export async function deleteCountryCode(id: string): Promise<void> {
  await db.countryCodes.delete(id);
}

export function newCountryCode(sortOrder: number): CountryCode {
  return { id: uid("cc_"), country: "", accountCode: "", sortOrder };
}

// ---------- Expenses ----------

export interface ExpenseFilter {
  start?: string; // YYYY-MM-DD inclusive
  end?: string; // YYYY-MM-DD inclusive
  country?: string; // "" = all
  status?: "all" | "pending" | "submitted";
  search?: string;
}

export async function listExpenses(filter: ExpenseFilter = {}): Promise<Expense[]> {
  let rows = await db.expenses.toArray();
  if (filter.start) rows = rows.filter((e) => e.date >= filter.start!);
  if (filter.end) rows = rows.filter((e) => e.date <= filter.end!);
  if (filter.country) rows = rows.filter((e) => e.country === filter.country);
  if (filter.status && filter.status !== "all") rows = rows.filter((e) => e.status === filter.status);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter((e) => e.description.toLowerCase().includes(q));
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  return db.expenses.get(id);
}

/** Creates an expense and its two images atomically. */
export async function createExpense(
  expense: Omit<Expense, "id" | "originalImageId" | "bwScanId" | "createdAt" | "status" | "invoiceNumber" | "reportId" | "baseCurrency"> & { baseCurrency?: string },
  originalImage: { mimeType: string; blob: Blob },
  bwScan: { mimeType: string; blob: Blob },
): Promise<Expense> {
  const id = uid("exp_");
  const originalImageId = uid("img_");
  const bwScanId = uid("img_");
  // Record the base currency this row was converted to (from the profile unless the caller overrides).
  const baseCurrency = expense.baseCurrency ?? (await getProfile()).baseCurrency;
  const full: Expense = {
    ...expense,
    baseCurrency,
    id,
    originalImageId,
    bwScanId,
    status: "pending",
    invoiceNumber: null,
    reportId: null,
    createdAt: Date.now(),
  };
  await db.transaction("rw", db.expenses, db.images, async () => {
    await db.images.put({ id: originalImageId, expenseId: id, kind: "original", ...originalImage });
    await db.images.put({ id: bwScanId, expenseId: id, kind: "bwscan", ...bwScan });
    await db.expenses.put(full);
  });
  return full;
}

export async function updateExpense(e: Expense): Promise<void> {
  await db.expenses.put(e);
}

export async function deleteExpense(id: string): Promise<void> {
  await db.transaction("rw", db.expenses, db.images, async () => {
    const imgs = await db.images.where("expenseId").equals(id).primaryKeys();
    await db.images.bulkDelete(imgs as string[]);
    await db.expenses.delete(id);
  });
}

export async function getImage(id: string, kind: ImageKind): Promise<StoredImage | undefined> {
  const e = await db.expenses.get(id);
  if (!e) return db.images.get(id); // allow direct image-id lookups too
  return db.images.get(kind === "original" ? e.originalImageId : e.bwScanId);
}

export async function getImageById(id: string): Promise<StoredImage | undefined> {
  return db.images.get(id);
}

// ---------- Reports ----------

export async function listReports(): Promise<ExpenseReport[]> {
  const all = await db.reports.toArray();
  return all.sort((a, b) => b.generatedAt - a.generatedAt);
}

export async function getReport(id: string): Promise<ExpenseReport | undefined> {
  return db.reports.get(id);
}

/** Marks the given expenses Submitted under a new report, atomically. */
export async function saveReport(report: ExpenseReport): Promise<void> {
  await db.transaction("rw", db.reports, db.expenses, async () => {
    await db.reports.put(report);
    for (const eid of report.expenseIds) {
      const e = await db.expenses.get(eid);
      if (e) await db.expenses.put({ ...e, status: "submitted", invoiceNumber: report.invoiceNumber, reportId: report.id });
    }
  });
}

export async function markReportPaid(id: string): Promise<void> {
  const r = await db.reports.get(id);
  if (!r) return;
  await db.reports.put({ ...r, status: "paid", paidAt: Date.now() });
}

/** Deletes a not-yet-paid report and returns its expenses to the unsubmitted pool. */
export async function deleteReport(id: string): Promise<void> {
  await db.transaction("rw", db.reports, db.expenses, async () => {
    const r = await db.reports.get(id);
    if (!r || r.status === "paid") return;
    for (const eid of r.expenseIds) {
      const e = await db.expenses.get(eid);
      if (e && e.reportId === id) {
        await db.expenses.put({ ...e, status: "pending", invoiceNumber: null, reportId: null });
      }
    }
    await db.reports.delete(id);
  });
}
