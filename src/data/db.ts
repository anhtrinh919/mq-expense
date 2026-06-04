import Dexie, { type Table } from "dexie";
import type { Profile, CountryCode, Expense, StoredImage, ExpenseReport, CaptureDraft } from "./types";

// All user data lives in this one IndexedDB database, on the user's device only.
export class MqExpenseDB extends Dexie {
  profile!: Table<Profile, string>;
  countryCodes!: Table<CountryCode, string>;
  expenses!: Table<Expense, string>;
  images!: Table<StoredImage, string>;
  reports!: Table<ExpenseReport, string>;
  // Transient in-progress capture queue (survives reload). NOT part of a backup.
  drafts!: Table<CaptureDraft, string>;

  constructor() {
    super("mq-expense");
    this.version(1).stores({
      profile: "id",
      countryCodes: "id, sortOrder",
      expenses: "id, date, country, status, reportId",
      images: "id, expenseId",
      reports: "id, generatedAt, status",
    });
    // Phase 2: per-user base currency + onboarding/PIN. Indexes unchanged; backfill records.
    this.version(2)
      .stores({
        profile: "id",
        countryCodes: "id, sortOrder",
        expenses: "id, date, country, status, reportId",
        images: "id, expenseId",
        reports: "id, generatedAt, status",
      })
      .upgrade(async (tx) => {
        await tx
          .table("profile")
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            if (p.baseCurrency === undefined) p.baseCurrency = (p.homeCurrency as string) ?? "VND";
            if (p.homeCountry === undefined) p.homeCountry = "Vietnam";
            if (p.pinHash === undefined) p.pinHash = null;
            if (p.onboardingComplete === undefined) p.onboardingComplete = true;
            delete p.homeCurrency;
          });
        await tx
          .table("expenses")
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            if (e.baseCurrency === undefined) e.baseCurrency = "VND";
          });
      });
    // Phase 2: transient capture-draft store (in-progress queue across reloads).
    this.version(3).stores({
      profile: "id",
      countryCodes: "id, sortOrder",
      expenses: "id, date, country, status, reportId",
      images: "id, expenseId",
      reports: "id, generatedAt, status",
      drafts: "id",
    });
  }
}

export const db = new MqExpenseDB();

export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
