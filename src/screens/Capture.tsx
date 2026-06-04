import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, listCountryCodes, createExpense } from "../data/repos";
import type { Profile, CountryCode } from "../data/types";
import { processReceipt, getFx, base64ToBlob, ApiError } from "../lib/api";
import { toVND, effectiveRate, conversionNote, rateSource } from "../lib/currency";
import { vnd, todayISO } from "../lib/format";
import { Banner } from "../components/ui";
import "./Capture.css";

const ACCEPT = "image/*,application/pdf,.heic,.heif";

interface QueueItem {
  id: string;
  file: File;
  status: "queued" | "reading" | "ready" | "lowconf" | "error";
  bwScan?: { mimeType: string; dataBase64: string };
  error?: string;
  // editable review fields
  date: string;
  amount: string;
  currency: string;
  country: string;
  accountCode: string;
  description: string;
}

let seq = 0;
function makeItem(file: File): QueueItem {
  return { id: `q${seq++}`, file, status: "queued", date: "", amount: "", currency: "", country: "", accountCode: "", description: "" };
}

export default function Capture() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [rate, setRate] = useState<{ ccy: string; value: number } | null>(null);
  const [rateErr, setRateErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const rateCache = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    getProfile().then(setProfile);
    listCountryCodes().then((c) => { setCodes(c); });
  }, []);

  const markup = profile?.currencyMarkupPct ?? 3;
  const current = queue[idx];

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setQueue((q) => [...q, ...arr.map(makeItem)]);
  }

  // Process the current item when it becomes active and is still queued.
  const processCurrent = useCallback(async () => {
    const item = queue[idx];
    if (!item || item.status !== "queued") return;
    setQueue((q) => q.map((it, i) => (i === idx ? { ...it, status: "reading" } : it)));
    try {
      const res = await processReceipt(item.file);
      const def = codes[0];
      const reading = res.reading;
      const lowconf = !!res.error || reading.confidence === "low" || reading.amount == null || reading.date == null;
      setQueue((q) =>
        q.map((it, i) =>
          i === idx
            ? {
                ...it,
                status: lowconf ? "lowconf" : "ready",
                bwScan: res.bwScan,
                date: reading.date ?? "",
                amount: reading.amount != null ? String(reading.amount) : "",
                currency: reading.currency ?? "",
                country: it.country || def?.country || "",
                accountCode: it.accountCode || def?.accountCode || "",
              }
            : it,
        ),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't reach the receipt reader.";
      setQueue((q) => q.map((it, i) => (i === idx ? { ...it, status: "error", error: msg } : it)));
    }
  }, [queue, idx, codes]);

  useEffect(() => { void processCurrent(); }, [idx, queue.length, processCurrent]);

  // Fetch FX rate whenever the current item's currency changes (non-VND).
  useEffect(() => {
    const ccy = (current?.currency || "").toUpperCase().trim();
    setRateErr(null);
    if (!ccy || ccy === "VND") { setRate(null); return; }
    if (rateCache.current.has(ccy)) { setRate({ ccy, value: rateCache.current.get(ccy)! }); return; }
    let cancelled = false;
    getFx(ccy)
      .then((r) => { if (!cancelled) { rateCache.current.set(ccy, r.rate); setRate({ ccy, value: r.rate }); } })
      .catch((e) => { if (!cancelled) { setRate(null); setRateErr(e instanceof ApiError ? e.message : "Rate unavailable"); } });
    return () => { cancelled = true; };
  }, [current?.currency]);

  function computeVND(): number | null {
    if (!current) return null;
    const amt = parseFloat(current.amount);
    if (isNaN(amt)) return null;
    const ccy = current.currency.toUpperCase().trim();
    if (!ccy || ccy === "VND") return Math.round(amt);
    if (rate && rate.ccy === ccy) return toVND(amt, rate.value, markup);
    return null;
  }

  function patchCurrent(p: Partial<QueueItem>) {
    setQueue((q) => q.map((it, i) => (i === idx ? { ...it, ...p } : it)));
  }

  function pickCountry(country: string) {
    const c = codes.find((x) => x.country === country);
    patchCurrent({ country, accountCode: c?.accountCode ?? "" });
  }

  function advance() {
    setRate(null);
    if (idx + 1 < queue.length) setIdx(idx + 1);
    else { setQueue([]); setIdx(0); }
  }

  async function save() {
    if (!current) return;
    const amt = parseFloat(current.amount);
    const vndAmt = computeVND();
    if (isNaN(amt) || vndAmt == null || !current.date) return;
    const ccy = current.currency.toUpperCase().trim();
    const isForeign = ccy && ccy !== "VND";
    const effRate = isForeign && rate ? effectiveRate(rate.value, markup) : null;
    const note = isForeign && effRate ? conversionNote(amt, ccy, effRate, vndAmt, markup) : "";

    const origBlob = current.file;
    const bw = current.bwScan ? base64ToBlob(current.bwScan.dataBase64, current.bwScan.mimeType) : current.file;

    await createExpense(
      {
        date: current.date,
        description: current.description || current.file.name.replace(/\.[^.]+$/, ""),
        amountVND: vndAmt,
        originalAmount: isForeign ? amt : null,
        originalCurrency: isForeign ? ccy : "VND",
        exchangeRate: effRate,
        rateSource: isForeign ? rateSource(markup) : "",
        country: current.country,
        accountCode: current.accountCode,
        notes: note,
      },
      { mimeType: origBlob.type || "image/jpeg", blob: origBlob },
      { mimeType: current.bwScan?.mimeType ?? origBlob.type ?? "application/pdf", blob: bw },
    );
    setSavedFlash(vnd(vndAmt));
    setTimeout(() => setSavedFlash(null), 1400);
    advance();
  }

  // ---------- render ----------

  if (queue.length === 0) {
    return (
      <div className="capture">
        <div className="cap-head">
          <h1 className="page-title">Capture</h1>
          <span className="muted">queue · 0</span>
        </div>
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <div className="dz-graphic" aria-hidden>🧾</div>
          <h2 className="serif">Drop receipts here</h2>
          <p className="muted">PDF or any image · several files at once is fine</p>
          <div className="dz-ctas">
            <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>Choose files</button>
            <button className="btn cap-camera" onClick={() => cameraInput.current?.click()}>📷 Take photo</button>
          </div>
          <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </div>
        <div className="cap-tips">
          <Tip k="PDF / JPG / PNG / HEIC" v="All common formats" />
          <Tip k="Up to 25 MB" v="per file" />
          <Tip k="Multiple at once" v="they queue and you review one at a time" />
        </div>
        {savedFlash && <div className="saved-flash">✓ Saved — {savedFlash}</div>}
      </div>
    );
  }

  const vndAmt = computeVND();
  const canSave = !!current && !!current.date && vndAmt != null && current.status !== "reading" && current.status !== "error";

  return (
    <div className="capture reviewing">
      <div className="rev-head">
        <div className="rev-title">
          <h1 className="page-title">Reviewing queue</h1>
          <span className="rev-pos num">{idx + 1} of {queue.length}</span>
        </div>
        <div className="rev-prog">
          {queue.map((it, i) => (
            <span key={it.id} className={`prog-seg${i < idx ? " done" : i === idx ? " active" : ""}`} />
          ))}
        </div>
        <div className="rev-actions">
          <button className="btn btn-ghost" onClick={advance}>{current?.status === "error" ? "Skip to next" : "Skip"}</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}>Save &amp; next ↵</button>
        </div>
      </div>

      {current?.status === "lowconf" && (
        <Banner kind="attention" title="Couldn't read every field" body="Check the receipt on the left and fill in anything blank." />
      )}
      {current?.status === "error" && (
        <Banner kind="error" title="This file couldn't be read" body={current.error} action={<button className="btn" onClick={advance}>Remove from queue</button>} />
      )}

      <div className="rev-body">
        <div className="rev-viewer">
          {current?.status === "error" ? (
            <div className="rv-errcard">
              <div className="banner-icon" style={{ background: "var(--status-error)" }}>!</div>
              <p className="muted">{current.file.name}</p>
              <p className="tertiary">Nothing was saved. The rest of your queue is fine.</p>
            </div>
          ) : current?.bwScan ? (
            <CapturePreview file={current.file} bw={current.bwScan} />
          ) : (
            <div className="rv-reading">
              <FilePreview file={current!.file} />
              {current?.status === "reading" && <div className="reading-overlay"><span className="spinner" /> Reading receipt…</div>}
            </div>
          )}
          <div className="rev-file tertiary num">{current?.file.name} · {(current!.file.size / 1e6).toFixed(1)} MB</div>
        </div>

        <div className="rev-inspector card">
          <div className="insp-head">
            <span className="eyebrow">{current?.status === "lowconf" ? "Partial read · check the blanks" : "Pre-filled from receipt"}</span>
            <h3>Receipt details</h3>
            <p className="muted">Confirm or edit. Saved as Unsubmitted until you generate a report.</p>
          </div>
          <label className="field"><span className="field-label">Date</span>
            <input className="input" type="date" value={current?.date || ""} onChange={(e) => patchCurrent({ date: e.target.value })} max={todayISO()} />
          </label>
          <div className="insp-amt">
            <label className="field"><span className="field-label">Amount</span>
              <input className="input mono" inputMode="decimal" value={current?.amount || ""} onChange={(e) => patchCurrent({ amount: e.target.value })} placeholder="0.00" />
            </label>
            <label className="field"><span className="field-label">Currency</span>
              <input className="input mono" value={current?.currency || ""} onChange={(e) => patchCurrent({ currency: e.target.value.toUpperCase() })} placeholder="THB" />
            </label>
          </div>
          <label className="field"><span className="field-label">Country / account</span>
            <select className="select" value={current?.country || ""} onChange={(e) => pickCountry(e.target.value)}>
              <option value="">Select…</option>
              {codes.map((c) => <option key={c.id} value={c.country}>{c.country} · {c.accountCode}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Description</span>
            <input className="input" value={current?.description || ""} onChange={(e) => patchCurrent({ description: e.target.value })} placeholder="e.g. Taxi — airport to hotel" />
          </label>
          <div className="insp-converted">
            <span className="field-label">Converted to VND</span>
            {vndAmt != null ? (
              <div className="conv-big num">{vnd(vndAmt)}</div>
            ) : rateErr ? (
              <div className="conv-err">{rateErr} — enter the VND amount manually by setting currency to VND</div>
            ) : current?.currency && current.currency.toUpperCase() !== "VND" ? (
              <div className="muted"><span className="spinner" /> fetching rate…</div>
            ) : (
              <div className="tertiary">Enter an amount</div>
            )}
            {vndAmt != null && rate && current?.currency.toUpperCase() !== "VND" && (
              <div className="tertiary num">{current?.amount} {rate.ccy} × {effectiveRate(rate.value, markup).toFixed(2)} (xe.com +{markup}%)</div>
            )}
          </div>
        </div>
      </div>
      {savedFlash && <div className="saved-flash">✓ Saved — {savedFlash}</div>}
      <button className="link-accent cap-back" onClick={() => navigate("/expenses")}>View all expenses →</button>
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  if (!url) return null;
  if (file.type === "application/pdf") return <iframe className="rv-frame" src={url} title="receipt" />;
  return <img className="rv-img" src={url} alt="receipt" />;
}

function CapturePreview({ file, bw }: { file: File; bw: { mimeType: string; dataBase64: string } }) {
  const [view, setView] = useState<"original" | "bwscan">("original");
  const [bwUrl, setBwUrl] = useState<string | null>(null);
  useEffect(() => {
    const blob = base64ToBlob(bw.dataBase64, bw.mimeType);
    const u = URL.createObjectURL(blob);
    setBwUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bw]);
  return (
    <div className="rv">
      <div className="rv-tabs">
        <button className={`rv-tab${view === "original" ? " active" : ""}`} onClick={() => setView("original")}>Colour</button>
        <button className={`rv-tab${view === "bwscan" ? " active" : ""}`} onClick={() => setView("bwscan")}>B&amp;W</button>
      </div>
      <div className="rv-stage">
        {view === "original" ? <FilePreview file={file} /> : bwUrl && (bw.mimeType === "application/pdf" ? <iframe className="rv-frame" src={bwUrl} title="bw" /> : <img className="rv-img" src={bwUrl} alt="bw scan" />)}
      </div>
    </div>
  );
}

function Tip({ k, v }: { k: string; v: string }) {
  return (
    <div className="tip">
      <div className="tip-k mono">{k}</div>
      <div className="tip-v tertiary">{v}</div>
    </div>
  );
}
