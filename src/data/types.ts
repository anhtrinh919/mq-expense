// Local-first data model. Everything here lives in the browser (IndexedDB via Dexie).
// The server persists none of it.

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
  homeCurrency: "VND";
  updatedAt: number;
}

export interface CountryCode {
  id: string;
  country: string; // e.g. "Vietnam"
  accountCode: string; // full label, e.g. "Vietnam: 8741-4105"
  sortOrder: number;
}

export type ExpenseStatus = "pending" | "submitted";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD (transaction date)
  description: string;
  amountVND: number; // whole VND, rounded
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
}

export type ImageKind = "original" | "bwscan";

export interface StoredImage {
  id: string;
  expenseId: string;
  kind: ImageKind;
  mimeType: string;
  blob: Blob;
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
}
