import { db } from "../data/db";
import type { Profile, CountryCode, Expense, ExpenseReport } from "../data/types";
import { blobToBase64, base64ToBlob } from "./api";

const MANIFEST = "mq-expense-backup";
const FORMAT_VERSION = 1;

interface BackupFile {
  manifest: typeof MANIFEST;
  formatVersion: number;
  exportedAt: string;
  profile: Profile | null;
  countryCodes: CountryCode[];
  expenses: Expense[];
  images: Array<{ id: string; expenseId: string; kind: string; mimeType: string; dataBase64: string }>;
  reports: Array<Omit<ExpenseReport, "combinedPdf" | "expenseXlsx"> & { combinedPdfBase64: string | null; expenseXlsxBase64: string | null }>;
}

export interface RestoreCounts {
  expenses: number;
  reports: number;
  images: number;
}

export async function exportAll(): Promise<{ blob: Blob; filename: string }> {
  const [profile, countryCodes, expenses, images, reports] = await Promise.all([
    db.profile.get("profile"),
    db.countryCodes.toArray(),
    db.expenses.toArray(),
    db.images.toArray(),
    db.reports.toArray(),
  ]);

  const data: BackupFile = {
    manifest: MANIFEST,
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile ?? null,
    countryCodes,
    expenses,
    images: await Promise.all(images.map(async (i) => ({ id: i.id, expenseId: i.expenseId, kind: i.kind, mimeType: i.mimeType, dataBase64: await blobToBase64(i.blob) }))),
    reports: await Promise.all(
      reports.map(async (r) => ({
        ...r,
        combinedPdf: undefined as never,
        expenseXlsx: undefined as never,
        combinedPdfBase64: r.combinedPdf ? await blobToBase64(r.combinedPdf) : null,
        expenseXlsxBase64: r.expenseXlsx ? await blobToBase64(r.expenseXlsx) : null,
      })),
    ),
  };

  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const filename = `mq-expense-${new Date().toISOString().slice(0, 10)}.mqx`;
  return { blob, filename };
}

export async function importAll(file: File): Promise<RestoreCounts> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't readable as a backup.");
  }
  if (parsed?.manifest !== MANIFEST) {
    throw new Error("That file isn't a valid MQ Expense backup (.mqx).");
  }

  const images = (parsed.images ?? []).map((i) => ({ id: i.id, expenseId: i.expenseId, kind: i.kind as "original" | "bwscan", mimeType: i.mimeType, blob: base64ToBlob(i.dataBase64, i.mimeType) }));
  const reports: ExpenseReport[] = (parsed.reports ?? []).map((r) => ({
    ...r,
    combinedPdf: r.combinedPdfBase64 ? base64ToBlob(r.combinedPdfBase64, "application/pdf") : null,
    expenseXlsx: r.expenseXlsxBase64 ? base64ToBlob(r.expenseXlsxBase64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") : null,
  }));

  await db.transaction("rw", [db.profile, db.countryCodes, db.expenses, db.images, db.reports], async () => {
    await Promise.all([db.profile.clear(), db.countryCodes.clear(), db.expenses.clear(), db.images.clear(), db.reports.clear()]);
    if (parsed.profile) await db.profile.put(parsed.profile);
    if (parsed.countryCodes?.length) await db.countryCodes.bulkPut(parsed.countryCodes);
    if (parsed.expenses?.length) await db.expenses.bulkPut(parsed.expenses);
    if (images.length) await db.images.bulkPut(images);
    if (reports.length) await db.reports.bulkPut(reports);
  });

  return { expenses: parsed.expenses?.length ?? 0, reports: reports.length, images: images.length };
}
