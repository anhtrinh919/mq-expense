// Thin client for the server endpoints. Receipt processing stays stateless; the session
// token (set by authClient) authorizes the now-gated processor + sync endpoints.

let sessionToken: string | null = null;
export function setSessionToken(token: string | null): void {
  sessionToken = token;
}
export function getSessionToken(): string | null {
  return sessionToken;
}
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return sessionToken ? { ...extra, authorization: `Bearer ${sessionToken}` } : extra;
}

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
  const res = await fetch("/api/process-receipt", { method: "POST", body: form, headers: authHeaders() });
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
  const res = await fetch(`/api/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error || `fx failed (${res.status})`);
  return body as FxResult;
}

export interface GenerateReportPayload {
  profile: unknown;
  invoiceNumber: string;
  periodLabel: string;
  baseCurrency: string;
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
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, withDetail(body, `generate-report failed (${res.status})`));
  return body as GenerateReportResult;
}

export interface ExportXlsxPayload {
  baseCurrency: string;
  periodLabel: string;
  expenses: Array<{ date: string; description: string; amountVND: number; accountCode: string }>;
}

export interface ExportXlsxResult {
  expenseXlsx: { filename: string; dataBase64: string };
}

export async function exportExpensesXlsx(payload: ExportXlsxPayload): Promise<ExportXlsxResult> {
  const res = await fetch("/api/export-expenses-xlsx", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, withDetail(body, `excel export failed (${res.status})`));
  return body as ExportXlsxResult;
}

/** Build a user-facing message that includes the server's `detail` when present. */
function withDetail(body: { error?: string; detail?: string }, fallback: string): string {
  const base = body?.error || fallback;
  return body?.detail ? `${base} — ${body.detail}` : base;
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
