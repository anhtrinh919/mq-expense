// Thin client for the stateless server endpoints. Nothing here persists on the server.

export interface ReceiptReading {
  date: string | null;
  amount: number | null;
  currency: string | null;
  confidence: "high" | "low";
}

export interface ProcessReceiptResult {
  reading: ReceiptReading;
  bwScan: { mimeType: string; dataBase64: string };
  /** present when the server returned 422 but could still scan */
  error?: string;
}

export async function processReceipt(file: File): Promise<ProcessReceiptResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/process-receipt", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (res.status === 200 || res.status === 422) return body as ProcessReceiptResult;
  throw new ApiError(res.status, body?.error || `process-receipt failed (${res.status})`);
}

export interface FxResult {
  rate: number;
  from: string;
  to: string;
  source: string;
  fetchedAt: string;
}

export async function getFx(from: string, to = "VND"): Promise<FxResult> {
  const res = await fetch(`/api/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error || `fx failed (${res.status})`);
  return body as FxResult;
}

export interface GenerateReportPayload {
  profile: unknown;
  invoiceNumber: string;
  periodLabel: string;
  expenses: Array<{
    date: string;
    description: string;
    amountVND: number;
    accountCode: string;
    notes: string;
    originalAmount: number | null;
    originalCurrency: string | null;
    exchangeRate: number | null;
    rateSource: string;
  }>;
  receipts: Array<{ expenseRef: string; mimeType: string; dataBase64: string }>;
}

export interface GenerateReportResult {
  combinedPdf: { filename: string; dataBase64: string };
  expenseXlsx: { filename: string; dataBase64: string };
}

export async function generateReport(payload: GenerateReportPayload): Promise<GenerateReportResult> {
  const res = await fetch("/api/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error || `generate-report failed (${res.status})`);
  return body as GenerateReportResult;
}

export interface HealthResult {
  status: string;
  reader: "claude" | "tesseract" | "unavailable";
}

export async function getHealth(): Promise<HealthResult> {
  const res = await fetch("/api/health");
  return (await res.json()) as HealthResult;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ---- base64 <-> Blob helpers (used for images + report files) ----

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
