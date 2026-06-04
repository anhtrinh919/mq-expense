import { Router } from "express";

// In-memory rate cache (1h TTL). The server keeps no user data — only ephemeral FX rates.
interface Cached { rate: number; source: string; fetchedAt: string; at: number; }
const cache = new Map<string, Cached>();
const TTL_MS = 60 * 60 * 1000;

const VALID = /^[A-Za-z]{3}$/;

class InvalidCurrency extends Error {}
class SourceDown extends Error {}

/** Fetches a reliable mid-market rate. open.er-api.com is free, keyless, and covers VND/THB/KHR/MMK.
 *  Distinguishes an unknown currency (→ caller 400) from the source being down (→ caller 502). */
async function fetchRate(from: string, to: string): Promise<{ rate: number; source: string }> {
  let data: { result?: string; rates?: Record<string, number> };
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok && res.status !== 404) throw new SourceDown("http " + res.status);
    data = (await res.json()) as typeof data;
  } catch (e) {
    if (e instanceof SourceDown) throw e;
    throw new SourceDown("fetch failed");
  }
  // open.er-api returns result:"error" for an unknown base currency.
  if (data?.result === "error") throw new InvalidCurrency(from);
  if (data?.result !== "success" || !data.rates) throw new SourceDown("bad response");
  const rate = data.rates[to];
  if (typeof rate !== "number" || !(rate > 0)) throw new InvalidCurrency(to);
  return { rate, source: "open.er-api.com (mid-market)" };
}

export const fxRouter = Router();

fxRouter.get("/fx", async (req, res) => {
  const from = String(req.query.from ?? "").toUpperCase();
  const to = String(req.query.to ?? "VND").toUpperCase();
  if (!VALID.test(from) || !VALID.test(to)) return res.status(400).json({ error: "invalid currency" });
  if (from === to) return res.json({ rate: 1, from, to, source: "identity", fetchedAt: new Date().toISOString() });

  const key = `${from}:${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return res.json({ rate: hit.rate, from, to, source: hit.source, fetchedAt: hit.fetchedAt });
  }
  try {
    const { rate, source } = await fetchRate(from, to);
    const fetchedAt = new Date().toISOString();
    cache.set(key, { rate, source, fetchedAt, at: Date.now() });
    res.json({ rate, from, to, source, fetchedAt });
  } catch (e) {
    if (e instanceof InvalidCurrency) return res.status(400).json({ error: "invalid currency" });
    res.status(502).json({ error: "rate source unavailable" });
  }
});
