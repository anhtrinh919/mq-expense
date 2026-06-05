import { run, which } from "./run.ts";

export interface Reading {
  date: string | null; // YYYY-MM-DD
  amount: number | null;
  currency: string | null;
  confidence: "high" | "low";
}

let cachedReader: "claude" | "unavailable" | null = null;

export async function readerStatus(): Promise<"claude" | "tesseract" | "unavailable"> {
  if (cachedReader === null) {
    const bin = await which("claude");
    cachedReader = bin ? "claude" : "unavailable";
  }
  return cachedReader;
}

const PROMPT = `You are reading a single expense receipt image. Extract exactly these fields and respond with ONLY a JSON object on one line, no prose, no markdown fences:
{"date":"YYYY-MM-DD or null","amount":<number or null>,"currency":"ISO code like THB/VND/USD or null","confidence":"high or low"}
Rules:
- "date" = the transaction date on the receipt, ISO format. null if not clearly readable.
- "amount" = the TOTAL paid, as a plain number (no thousands separators, no symbol). null if not clearly readable.
- "currency" = the 3-letter ISO code of the amount printed on the receipt. null if unclear.
- "confidence" = "high" only if date AND amount AND currency are all clearly legible; otherwise "low".
The receipt image is at: `;

/** Reads a receipt image via `claude -p`. Returns nulls + low confidence on any failure (never throws). */
export async function readReceipt(imagePath: string): Promise<Reading> {
  const bin = await which("claude");
  if (!bin) return { date: null, amount: null, currency: null, confidence: "low" };

  const r = await run(
    "claude",
    ["-p", "--model", "sonnet", "--output-format", "json", "--permission-mode", "bypassPermissions", PROMPT + imagePath],
    { timeoutMs: 60_000 },
  );
  if (r.code !== 0) return { date: null, amount: null, currency: null, confidence: "low" };

  // The CLI envelope is JSON with a `result` string holding the model's text.
  let text = r.stdout.trim();
  try {
    const env = JSON.parse(text);
    if (typeof env?.result === "string") text = env.result;
  } catch {
    /* not an envelope — treat stdout as the text */
  }
  return parseReading(text);
}

export function parseReading(text: string): Reading {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { date: null, amount: null, currency: null, confidence: "low" };
  try {
    const o = JSON.parse(m[0]);
    const amount = typeof o.amount === "number" ? o.amount : o.amount != null && !isNaN(Number(o.amount)) ? Number(o.amount) : null;
    const date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
    const currency = typeof o.currency === "string" && /^[A-Za-z]{3}$/.test(o.currency) ? o.currency.toUpperCase() : null;
    const confidence: "high" | "low" = o.confidence === "high" && date && amount != null && currency ? "high" : "low";
    return { date, amount, currency, confidence };
  } catch {
    return { date: null, amount: null, currency: null, confidence: "low" };
  }
}
