import Dexie, { type Table } from "dexie";
import type {
  Profile,
  CountryCode,
  Expense,
  StoredImage,
  ExpenseReport,
  CaptureDraft,
  AccountState,
  Tombstone,
} from "./types";

// All user data lives in this one IndexedDB database, on the user's device only.
export class MqExpenseDB extends Dexie {
  profile!: Table<Profile, string>;
  countryCodes!: Table<CountryCode, string>;
  expenses!: Table<Expense, string>;
  images!: Table<StoredImage, string>;
  reports!: Table<ExpenseReport, string>;
  // Transient in-progress capture queue (survives reload). NOT part of a backup.
  drafts!: Table<CaptureDraft, string>;
  // Phase 3: local account/session + sync cursors (singleton), and delete tombstones.
  account!: Table<AccountState, string>;
  tombstones!: Table<Tombstone, string>;

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
    // Phase 3: local account/session + sync cursors, and delete tombstones for sync.
    this.version(4).stores({
      profile: "id, updatedAt",
      countryCodes: "id, sortOrder, updatedAt",
      expenses: "id, date, country, status, reportId, updatedAt",
      images: "id, expenseId, updatedAt",
      reports: "id, generatedAt, status, updatedAt",
      drafts: "id",
      account: "id",
      tombstones: "key, store, deletedAt",
    });
  }
}

export const db = new MqExpenseDB();

// ---- sync write-stamping ----
// Every write to a synced store stamps `updatedAt` (used for last-write-wins). When the
// sync engine applies a record pulled from the server, it sets `suppressStamp` so the
// remote timestamp is preserved instead of being overwritten with the local clock.
let suppressDepth = 0;
export async function withSuppressedStamp<T>(fn: () => Promise<T>): Promise<T> {
  suppressDepth++;
  try {
    return await fn();
  } finally {
    suppressDepth--;
  }
}

const SYNCED_TABLES = ["profile", "countryCodes", "expenses", "images", "reports"] as const;
for (const name of SYNCED_TABLES) {
  const table = (db as unknown as Record<string, Table<{ updatedAt?: number }, string>>)[name];
  table.hook("creating", (_pk, obj) => {
    if (suppressDepth === 0 && obj.updatedAt === undefined) obj.updatedAt = Date.now();
  });
  table.hook("updating", (_mods, _pk, _obj) => {
    if (suppressDepth > 0) return;
    return { updatedAt: Date.now() };
  });
}

export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
