import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, listCountryCodes, createExpense } from "../data/repos";
import { loadCaptureDraft, saveCaptureDraft, clearCaptureDraft } from "../data/captureDraft";
import type { Profile, CountryCode } from "../data/types";
import { processReceipt, getFx, base64ToBlob, ApiError } from "../lib/api";
import { toVND, effectiveRate, conversionNote, rateSource } from "../lib/currency";
import { money, todayISO } from "../lib/format";
import { Banner } from "../components/ui";
import "./Capture.css";

const ACCEPT = "image/*,application/pdf,.heic,.heif";
const READ_CONCURRENCY = 3;

type ItemStatus = "queued" | "reading" | "ready" | "lowconf" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  bwScan?: { mimeType: string; dataBase64: string };
  error?: string;
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

const STATUS_LABEL: Record<ItemStatus, string> = {
  queued: "Queued", reading: "Reading…", ready: "Read", lowconf: "Needs attention", error: "Couldn't read",
};

export default function Capture() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState<"edit" | "reviewall">("edit");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [restored, setRestored] = useState(false);
  const [rateErrs, setRateErrs] = useState<Record<string, string>>({});
  const [srcOpen, setSrcOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const rateCache = useRef<Map<string, number>>(new Map());
  const codesRef = useRef<CountryCode[]>([]);
  const preferredRef = useRef<string>("");
  const [, forceTick] = useState(0);
  const [isTouch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

  const base = (profile?.baseCurrency || "VND").toUpperCase();
  const markup = profile?.currencyMarkupPct ?? 3;
  const current = queue[idx];

  // ---- load profile/codes + restore an in-progress draft ----
  useEffect(() => {
    getProfile().then((p) => { setProfile(p); preferredRef.current = p.preferredCountry || ""; });
    listCountryCodes().then((c) => { setCodes(c); codesRef.current = c; });
    loadCaptureDraft().then((d) => {
      if (!d || !d.items.length) return;
      const items: QueueItem[] = d.items.map((it) => ({
        id: it.id,
        file: new File([it.fileBlob], it.fileName, { type: it.fileType }),
        status: it.status === "reading" ? "queued" : it.status, // a reload interrupted the read — re-read it
        bwScan: it.bwScanData ? { mimeType: it.bwScanMime || "application/pdf", dataBase64: it.bwScanData } : undefined,
        error: it.error,
        date: it.date, amount: it.amount, currency: it.currency, country: it.country, accountCode: it.accountCode, description: it.description,
      }));
      setQueue(items);
      setIdx(Math.min(d.idx, items.length - 1));
      setRestored(true);
    });
  }, []);

  useEffect(() => { codesRef.current = codes; }, [codes]);

  // ---- background read pool: keep up to READ_CONCURRENCY items reading ----
  useEffect(() => {
    const reading = queue.filter((it) => it.status === "reading").length;
    let slots = READ_CONCURRENCY - reading;
    if (slots <= 0) return;
    const toStart = queue.filter((it) => it.status === "queued").slice(0, slots);
    if (!toStart.length) return;
    const ids = new Set(toStart.map((it) => it.id));
    setQueue((q) => q.map((it) => (ids.has(it.id) ? { ...it, status: "reading" } : it)));
    for (const it of toStart) void readItem(it.id, it.file);
    void slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  async function ensureRate(ccyRaw: string) {
    const ccy = ccyRaw.toUpperCase().trim();
    if (!ccy || ccy === base) return;
    if (rateCache.current.has(ccy)) return;
    try {
      const r = await getFx(ccy, base);
      rateCache.current.set(ccy, r.rate);
      setRateErrs((m) => { const n = { ...m }; delete n[ccy]; return n; });
      forceTick((t) => t + 1);
    } catch (e) {
      setRateErrs((m) => ({ ...m, [ccy]: e instanceof ApiError ? e.message : "Rate unavailable" }));
    }
  }

  async function readItem(id: string, file: File) {
    try {
      const res = await processReceipt(file);
      const r = res.reading;
      const lowconf = !!res.error || r.confidence === "low" || r.amount == null || r.date == null;
      const def = codesRef.current.find((c) => c.country === preferredRef.current) || codesRef.current[0];
      setQueue((q) => q.map((it) => it.id === id ? {
        ...it,
        status: lowconf ? "lowconf" : "ready",
        bwScan: res.bwScan,
        date: it.date || r.date || "",
        amount: it.amount || (r.amount != null ? String(r.amount) : ""),
        currency: it.currency || r.currency || "",
        country: it.country || def?.country || "",
        accountCode: it.accountCode || def?.accountCode || "",
      } : it));
      if (r.currency) void ensureRate(r.currency);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't reach the receipt reader.";
      setQueue((q) => q.map((it) => it.id === id ? { ...it, status: "error", error: msg } : it));
    }
  }

  // ---- autosave the draft (debounced) ----
  useEffect(() => {
    const t = setTimeout(() => {
      if (queue.length === 0) { void clearCaptureDraft(); return; }
      void saveCaptureDraft({
        idx,
        items: queue.map((it) => ({
          id: it.id, fileName: it.file.name, fileType: it.file.type, fileBlob: it.file,
          status: it.status, bwScanMime: it.bwScan?.mimeType, bwScanData: it.bwScan?.dataBase64, error: it.error,
          date: it.date, amount: it.amount, currency: it.currency, country: it.country, accountCode: it.accountCode, description: it.description,
        })),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [queue, idx]);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setDoneCount(0);
    setRestored(false);
    setQueue((q) => [...q, ...arr.map(makeItem)]);
  }

  function vndFor(it: QueueItem): number | null {
    const amt = parseFloat(it.amount);
    if (isNaN(amt)) return null;
    const ccy = it.currency.toUpperCase().trim();
    if (!ccy || ccy === base) return Math.round(amt);
    const r = rateCache.current.get(ccy);
    if (r == null) { void ensureRate(ccy); return null; }
    return toVND(amt, r, markup);
  }

  function patch(id: string, p: Partial<QueueItem>) {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...p } : it)));
    if (p.currency) void ensureRate(p.currency);
  }
  function patchCurrent(p: Partial<QueueItem>) { if (current) patch(current.id, p); }
  function pickCountry(id: string, country: string) {
    const c = codesRef.current.find((x) => x.country === country);
    patch(id, { country, accountCode: c?.accountCode ?? "" });
  }

  function savableOf(it: QueueItem): boolean {
    return it.status !== "error" && it.status !== "reading" && it.status !== "queued" && !!it.date && vndFor(it) != null;
  }

  async function saveOne(it: QueueItem) {
    const amt = parseFloat(it.amount);
    const vndAmt = vndFor(it);
    if (vndAmt == null) return false;
    const ccy = it.currency.toUpperCase().trim();
    const isForeign = !!ccy && ccy !== base;
    const effRate = isForeign ? effectiveRate(rateCache.current.get(ccy)!, markup) : null;
    const note = isForeign && effRate ? conversionNote(amt, ccy, effRate, vndAmt, markup, base) : "";
    const bw = it.bwScan ? base64ToBlob(it.bwScan.dataBase64, it.bwScan.mimeType) : it.file;
    await createExpense(
      {
        date: it.date,
        description: it.description || it.file.name.replace(/\.[^.]+$/, ""),
        amountVND: vndAmt,
        baseCurrency: base,
        originalAmount: isForeign ? amt : null,
        originalCurrency: isForeign ? ccy : base,
        exchangeRate: effRate,
        rateSource: isForeign ? rateSource(markup) : "",
        country: it.country,
        accountCode: it.accountCode,
        notes: note,
      },
      { mimeType: it.file.type || "image/jpeg", blob: it.file },
      { mimeType: it.bwScan?.mimeType ?? it.file.type ?? "application/pdf", blob: bw },
    );
    return true;
  }

  function removeItem(id: string) {
    setQueue((q) => {
      const next = q.filter((it) => it.id !== id);
      setIdx((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  }

  // Skip = set this receipt aside and move on WITHOUT deleting it. Wraps around so you
  // always cycle back to anything you skipped (and the progress bars below jump too).
  function skipCurrent() {
    setIdx((i) => (queue.length ? (i + 1) % queue.length : 0));
  }

  async function saveCurrent() {
    if (!current || !savableOf(current)) return;
    const vndAmt = vndFor(current)!;
    await saveOne(current);
    setSavedFlash(money(vndAmt, base));
    setTimeout(() => setSavedFlash(null), 1400);
    setDoneCount((n) => n + 1);
    removeItem(current.id);
  }

  async function saveAll() {
    const savable = queue.filter(savableOf);
    for (const it of savable) await saveOne(it);
    await clearCaptureDraft();
    setDoneCount(savable.length);
    setQueue([]); setIdx(0); setView("edit"); setRestored(false);
  }

  async function discardAll() {
    await clearCaptureDraft();
    setQueue([]); setIdx(0); setView("edit"); setRestored(false);
  }

  // ---------- render: empty / done ----------
  if (queue.length === 0) {
    return (
      <div className="capture">
        <div className="cap-head">
          <h1 className="page-title">Capture</h1>
          <span className="muted">queue · 0</span>
        </div>
        {doneCount > 0 && (
          <div className="cap-done card">
            <div className="success-check">✓</div>
            <div className="cap-done-body">
              <h2>{doneCount} receipt{doneCount > 1 ? "s" : ""} logged</h2>
              <p className="muted">Saved on this device as Unsubmitted. Bundle them into a Macquarie report whenever you're ready.</p>
            </div>
            <div className="cap-done-ctas">
              <button className="btn" onClick={() => navigate("/expenses")}>View expenses →</button>
              <button className="btn btn-primary" onClick={() => navigate("/reports")}>Create a report →</button>
            </div>
          </div>
        )}
        <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
          <div className="dz-graphic" aria-hidden>🧾</div>
          <h2 className="serif">{doneCount > 0 ? "Add more receipts" : "Drop receipts here"}</h2>
          <p className="muted">PDF or any image · several files at once is fine</p>
          <div className="dz-ctas">
            {isTouch ? (
              <div className="cap-src">
                <button className="btn btn-primary cap-src-btn" aria-haspopup="menu" aria-expanded={srcOpen} onClick={() => setSrcOpen((o) => !o)}>+ Add receipts ▾</button>
                {srcOpen && (
                  <>
                    <div className="cap-src-backdrop" onClick={() => setSrcOpen(false)} />
                    <div className="cap-src-menu" role="menu">
                      <button role="menuitem" onClick={() => { setSrcOpen(false); galleryInput.current?.click(); }}>🖼️ From gallery</button>
                      <button role="menuitem" onClick={() => { setSrcOpen(false); cameraInput.current?.click(); }}>📷 Take a photo</button>
                      <button role="menuitem" onClick={() => { setSrcOpen(false); fileInput.current?.click(); }}>📄 From files</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>Choose files</button>
            )}
          </div>
          <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </div>
        <div className="cap-tips">
          <Tip k="PDF / JPG / PNG / HEIC" v="All common formats" />
          <Tip k="Up to 25 MB" v="per file" />
          <Tip k="Read in the background" v="add several, review them in one pass" />
        </div>
        {savedFlash && <div className="saved-flash">✓ Saved — {savedFlash}</div>}
      </div>
    );
  }

  const readingCount = queue.filter((it) => it.status === "reading" || it.status === "queued").length;
  const savableCount = queue.filter(savableOf).length;

  // ---------- render: review-all summary ----------
  if (view === "reviewall") {
    return (
      <div className="capture reviewing">
        <div className="rev-head">
          <div className="rev-title">
            <h1 className="page-title">Review all</h1>
            <span className="rev-pos num">{queue.length} receipt{queue.length > 1 ? "s" : ""}{readingCount > 0 ? ` · ${readingCount} still reading` : ""}</span>
          </div>
          <div className="rev-actions">
            <button className="btn btn-ghost" onClick={() => setView("edit")}>Back to one-by-one</button>
            <button className="btn btn-primary" disabled={savableCount === 0} onClick={() => void saveAll()}>Save all ({savableCount}) ↵</button>
          </div>
        </div>
        {restored && <Banner kind="attention" title="Restored your in-progress receipts" body="Picked up where you left off before the page reloaded." />}
        <div className="ra-list">
          {queue.map((it) => {
            const v = vndFor(it);
            return (
              <div className={`ra-row card${it.status === "error" ? " ra-err" : ""}`} key={it.id}>
                <div className="ra-meta">
                  <span className={`ra-status ra-${it.status}`}>{STATUS_LABEL[it.status]}</span>
                  <span className="ra-name tertiary">{it.file.name}</span>
                </div>
                {it.status === "error" ? (
                  <div className="ra-fields"><span className="conv-err">{it.error} — remove and re-add this file.</span></div>
                ) : (
                  <div className="ra-fields">
                    <input className="input" type="date" value={it.date} max={todayISO()} onChange={(e) => patch(it.id, { date: e.target.value })} />
                    <input className="input mono" inputMode="decimal" placeholder="0.00" value={it.amount} onChange={(e) => patch(it.id, { amount: e.target.value })} />
                    <input className="input mono ra-ccy" placeholder={base} value={it.currency} onChange={(e) => patch(it.id, { currency: e.target.value.toUpperCase() })} />
                    <select className="select" value={it.country} onChange={(e) => pickCountry(it.id, e.target.value)}>
                      <option value="">Country…</option>
                      {codes.map((c) => <option key={c.id} value={c.country}>{c.country}</option>)}
                    </select>
                    <input className="input ra-desc" placeholder="Description" value={it.description} onChange={(e) => patch(it.id, { description: e.target.value })} />
                    <span className="ra-conv num">{v != null ? money(v, base) : "—"}</span>
                  </div>
                )}
                <button className="btn btn-ghost ra-del" onClick={() => removeItem(it.id)} aria-label="Remove">✕</button>
              </div>
            );
          })}
        </div>
        {savedFlash && <div className="saved-flash">✓ Saved — {savedFlash}</div>}
      </div>
    );
  }

  // ---------- render: one-by-one inspector ----------
  const vndAmt = current ? vndFor(current) : null;
  const ccyUp = (current?.currency || "").toUpperCase();
  const isForeign = !!ccyUp && ccyUp !== base;
  const rateErr = isForeign ? rateErrs[ccyUp] : undefined;
  const canSave = !!current && savableOf(current);

  // Enter anywhere in the review pane saves the current receipt and advances — except when a
  // button (Skip / Delete / Review all) has focus, where Enter should activate that button.
  function onReviewKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || e.shiftKey || (e.target as HTMLElement).tagName === "BUTTON") return;
    if (canSave) { e.preventDefault(); void saveCurrent(); }
  }

  return (
    <div className="capture reviewing" onKeyDown={onReviewKeyDown}>
      <div className="rev-head">
        <div className="rev-title">
          <h1 className="page-title">Reviewing queue</h1>
          <span className="rev-pos num">{idx + 1} of {queue.length}</span>
        </div>
        <div className="rev-prog" aria-label="receipt statuses">
          {queue.map((it, i) => (
            <span key={it.id} className={`prog-seg seg-${it.status}${i === idx ? " active" : ""}`} title={`${it.file.name}: ${STATUS_LABEL[it.status]}`} onClick={() => setIdx(i)} />
          ))}
        </div>
        <div className="rev-actions">
          <button className="btn btn-ghost" onClick={() => setView("reviewall")}>Review all ({queue.length})</button>
          <button className="btn btn-ghost" onClick={skipCurrent} disabled={queue.length < 2} title="Set aside — you can come back to it">Skip</button>
          <button className="btn btn-ghost cap-del" onClick={() => current && removeItem(current.id)} title="Remove this receipt for good">🗑 Delete</button>
          <button className="btn btn-primary cap-save-top" disabled={!canSave} onClick={() => void saveCurrent()}>Save &amp; next ↵</button>
        </div>
      </div>

      {restored && <Banner kind="attention" title="Restored your in-progress receipts" body="Picked up where you left off before the page reloaded." />}
      {current?.status === "lowconf" && (
        <Banner kind="attention" title="Couldn't read every field" body="Check the receipt on the left and fill in anything blank." />
      )}
      {current?.status === "error" && (
        <Banner kind="error" title="This file couldn't be read" body={current.error} action={<button className="btn" onClick={() => current && removeItem(current.id)}>Remove from queue</button>} />
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
              {(current?.status === "reading" || current?.status === "queued") && <div className="reading-overlay"><span className="spinner" /> Reading receipt…</div>}
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
              <input className="input mono" value={current?.currency || ""} onChange={(e) => patchCurrent({ currency: e.target.value.toUpperCase() })} placeholder={base} />
            </label>
          </div>
          <label className="field"><span className="field-label">Country / account</span>
            <select className="select" value={current?.country || ""} onChange={(e) => current && pickCountry(current.id, e.target.value)}>
              <option value="">Select…</option>
              {codes.map((c) => <option key={c.id} value={c.country}>{c.country} · {c.accountCode}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Description</span>
            <input className="input" value={current?.description || ""} onChange={(e) => patchCurrent({ description: e.target.value })} placeholder="e.g. Taxi — airport to hotel" />
          </label>
          <div className="insp-converted">
            <span className="field-label">Converted to {base}</span>
            {vndAmt != null ? (
              <div className="conv-big num">{money(vndAmt, base)}</div>
            ) : rateErr ? (
              <div className="conv-err">{rateErr} — set currency to {base} to enter the amount directly</div>
            ) : isForeign ? (
              <div className="muted"><span className="spinner" /> fetching rate…</div>
            ) : (
              <div className="tertiary">Enter an amount</div>
            )}
            {vndAmt != null && isForeign && rateCache.current.get(ccyUp) != null && (
              <div className="tertiary num">{current?.amount} {ccyUp} × {effectiveRate(rateCache.current.get(ccyUp)!, markup).toFixed(2)} (xe.com +{markup}%)</div>
            )}
          </div>
          <button className="btn btn-primary cap-save-mobile" disabled={!canSave} onClick={() => void saveCurrent()}>Save &amp; next ↵</button>
        </div>
      </div>
      {savedFlash && <div className="saved-flash">✓ Saved — {savedFlash}</div>}
      <button className="link-accent cap-back" onClick={() => void discardAll()}>Discard this batch</button>
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
