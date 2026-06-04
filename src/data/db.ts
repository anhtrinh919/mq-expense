import Dexie, { type Table } from "dexie";
import type { Profile, CountryCode, Expense, StoredImage, ExpenseReport } from "./types";

// All user data lives in this one IndexedDB database, on the user's device only.
export class MqExpenseDB extends Dexie {
  profile!: Table<Profile, string>;
  countryCodes!: Table<CountryCode, string>;
  expenses!: Table<Expense, string>;
  images!: Table<StoredImage, string>;
  reports!: Table<ExpenseReport, string>;

  constructor() {
    super("mq-expense");
    this.version(1).stores({
      profile: "id",
      countryCodes: "id, sortOrder",
      expenses: "id, date, country, status, reportId",
      images: "id, expenseId",
      reports: "id, generatedAt, status",
    });
  }
}

export const db = new MqExpenseDB();

export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
