// Local-first data model. The browser's IndexedDB (via Dexie) is the working store.
// Phase 3: synced records also live encrypted on the server (per account) for cross-device
// sync. Every synced record carries an `updatedAt` (stamped by a Dexie hook) used for
// last-write-wins; deletes are recorded as tombstones so removals propagate.

/** Local account/session + sync cursors. Singleton keyed "account". */
export interface AccountState {
  id: "account";
  accountId: string | null;
  email: string | null;
  name: string | null;
  role: "manager" | "peer" | null;
  sessionToken: string | null;
  pinHashLocal: string | null; // local hash of the PIN for offline quick-unlock
  pullCursor: number; // server watermark for incremental pull
  pushHigh: number; // highest local updatedAt already pushed
  updatedAt: number;
}

/** Tombstone for a deleted synced record, so the delete reaches the server + other devices. */
export interface Tombstone {
  key: string; // `${store}:${recordId}`
  store: string;
  recordId: string;
  deletedAt: number;
}

export interface Submitter {
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
}

export interface InvoiceTo {
  name: string;
  address: string;
  email: string;
}

export interface Bank {
  accountName: string;
  accountNumber: string;
  swift: string;
  bankName: string;
}

export interface Profile {
  id: "profile"; // singleton key
  invoicePrefix: string;
  vendorId: string;
  submitter: Submitter;
  invoiceTo: InvoiceTo;
  bank: Bank;
  currencyMarkupPct: number;
  baseCurrency: string; // reimbursement currency (was fixed "VND" in Phase 1)
  homeCountry: string; // country chosen at onboarding that seeded baseCurrency
  preferredCountry: string; // default country/account code pre-filled on every new capture ("" = use first code)
  pinHash: string | null; // hash of the app PIN, or null when no PIN is set (reassurance only, not encryption)
  onboardingComplete: boolean; // false triggers the first-run wizard
  updatedAt: number;
}

export interface CountryCode {
  id: string;
  country: string; // e.g. "Vietnam"
  accountCode: string; // full label, e.g. "Vietnam: 8741-4105"
  sortOrder: number;
  updatedAt?: number; // sync stamp (Dexie hook)
}

export type ExpenseStatus = "pending" | "submitted";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD (transaction date)
  description: string;
  amountVND: number; // whole units of baseCurrency, rounded (field name kept from Phase 1 for stack compatibility)
  baseCurrency: string; // reimbursement currency this row was converted to, recorded at capture time
  originalAmount: number | null;
  originalCurrency: string | null; // e.g. "THB"; null/"VND" if already VND
  exchangeRate: number | null; // VND per 1 unit of originalCurrency, after markup
  rateSource: string; // e.g. "xe.com +3%"
  country: string;
  accountCode: string; // copied from the chosen CountryCode
  notes: string;
  status: ExpenseStatus;
  invoiceNumber: string | null;
  reportId: string | null;
  originalImageId: string;
  bwScanId: string;
  createdAt: number;
  updatedAt?: number; // sync stamp (Dexie hook)
}

export type ImageKind = "original" | "bwscan";

export interface StoredImage {
  id: string;
  expenseId: string;
  kind: ImageKind;
  mimeType: string;
  blob: Blob;
  updatedAt?: number; // sync stamp (Dexie hook)
}

// ---- Transient capture draft (in-progress queue, survives reload; never backed up) ----

export interface CaptureDraftItem {
  id: string;
  fileName: string;
  fileType: string;
  fileBlob: Blob;
  status: "queued" | "reading" | "ready" | "lowconf" | "error";
  bwScanMime?: string;
  bwScanData?: string; // base64 of the B&W scan returned by the server
  error?: string;
  date: string;
  amount: string;
  currency: string;
  country: string;
  accountCode: string;
  description: string;
}

export interface CaptureDraft {
  id: "capture"; // singleton
  idx: number;
  items: CaptureDraftItem[];
  savedAt: number;
}

export type ReportStatus = "generated" | "paid";

export interface ExpenseReport {
  id: string;
  invoiceNumber: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  periodLabel: string;
  totalVND: number;
  expenseIds: string[];
  status: ReportStatus;
  generatedAt: number;
  paidAt: number | null;
  combinedPdf: Blob | null;
  expenseXlsx: Blob | null;
  updatedAt?: number; // sync stamp (Dexie hook)
}
