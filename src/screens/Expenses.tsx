import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listExpenses, listCountryCodes, updateExpense, deleteExpense, type ExpenseFilter } from "../data/repos";
import type { Expense, CountryCode } from "../data/types";
import { getFx, ApiError } from "../lib/api";
import { toVND, effectiveRate, conversionNote, rateSource } from "../lib/currency";
import { getProfile } from "../data/repos";
import { vnd, num, fmtDate } from "../lib/format";
import { PageHeader, StatusChip, EmptyState, Modal } from "../components/ui";
import ReceiptViewer from "../components/ReceiptViewer";
import "./Expenses.css";

export default function Expenses() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [markup, setMarkup] = useState(3);
  const [filter, setFilter] = useState<ExpenseFilter>({ status: "all" });
  const [editing, setEditing] = useState<Expense | null>(null);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const reload = useCallback(() => { listExpenses(filter).then(setRows); }, [filter]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    listCountryCodes().then(setCodes);
    getProfile().then((p) => setMarkup(p.currencyMarkupPct));
  }, []);

  const total = rows.reduce((s, e) => s + e.amountVND, 0);

  function exportCsv() {
    const head = ["Date", "Description", "Original", "Currency", "Rate", "VND", "Country", "Account code", "Status", "Invoice"];
    const lines = rows.map((e) => [
      e.date, e.description, e.originalAmount ?? "", e.originalCurrency ?? "VND", e.exchangeRate ?? "",
      e.amountVND, e.country, e.accountCode, e.status, e.invoiceNumber ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [head.join(","), ...lines].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="expenses">
      <PageHeader
        title="Expenses"
        subtitle="All receipts captured on this device"
        right={
          <>
            <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button>
            <Link to="/capture" className="btn btn-primary">+ Capture</Link>
          </>
        }
      />

      <div className="filter-bar">
        <label className="filt"><span className="filt-k">From</span><input className="input filt-in" type="date" value={filter.start ?? ""} onChange={(e) => setFilter((f) => ({ ...f, start: e.target.value || undefined }))} /></label>
        <label className="filt"><span className="filt-k">To</span><input className="input filt-in" type="date" value={filter.end ?? ""} onChange={(e) => setFilter((f) => ({ ...f, end: e.target.value || undefined }))} /></label>
        <label className="filt"><span className="filt-k">Country</span>
          <select className="select filt-in" value={filter.country ?? ""} onChange={(e) => setFilter((f) => ({ ...f, country: e.target.value || undefined }))}>
            <option value="">All</option>
            {codes.map((c) => <option key={c.id} value={c.country}>{c.country}</option>)}
          </select>
        </label>
        <label className="filt"><span className="filt-k">Status</span>
          <select className="select filt-in" value={filter.status ?? "all"} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as ExpenseFilter["status"] }))}>
            <option value="all">All</option>
            <option value="pending">Unsubmitted</option>
            <option value="submitted">Submitted</option>
          </select>
        </label>
        <input className="input filt-search" placeholder="Search description…" value={filter.search ?? ""} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value || undefined }))} />
        <div className="filt-sum">
          <span className="tertiary">Showing {rows.length}</span>
          <span className="filt-total num">{vnd(total)}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No expenses yet" body="Capture your first receipt — we'll read it, convert the amount to VND, and store it here." action={<Link to="/capture" className="btn btn-primary">+ Capture a receipt</Link>} />
      ) : (
        <div className="exp-table card">
          <div className="exp-head">
            <span>Date</span><span>Description</span><span>Original</span><span>Rate</span><span className="ta-r">VND</span><span>Country</span><span>Status</span><span />
          </div>
          {rows.map((e) => (
            <div className="exp-row" key={e.id}>
              <span className="num exp-date">{fmtDate(e.date)}</span>
              <span className="exp-desc">{e.description || <em className="tertiary">(no description)</em>}</span>
              <span className="num exp-orig tertiary">{e.originalCurrency && e.originalCurrency !== "VND" ? `${num(e.originalAmount ?? 0)} ${e.originalCurrency}` : "—"}</span>
              <span className="num exp-rate tertiary">{e.exchangeRate ? num(e.exchangeRate, 0) : "1"}</span>
              <span className="num exp-vnd ta-r">{vnd(e.amountVND)}</span>
              <span className="exp-cc tertiary">{e.country}</span>
              <span><StatusChip kind={e.status === "submitted" ? "submitted" : "pending"} /></span>
              <span className="exp-act">
                <button className="btn btn-ghost ico" title="View receipt" onClick={() => setViewing(e)}>🧾</button>
                <button className="btn btn-ghost ico" title="Edit" onClick={() => setEditing(e)}>✎</button>
                <button className="btn btn-ghost ico" title="Delete" onClick={() => setDeleting(e)}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <Modal eyebrow="Receipt" title={viewing.description || viewing.country} onClose={() => setViewing(null)}>
          <ReceiptViewer originalImageId={viewing.originalImageId} bwScanId={viewing.bwScanId} />
          <p className="muted vw-meta num">{vnd(viewing.amountVND)} · {viewing.originalCurrency && viewing.originalCurrency !== "VND" ? `${num(viewing.originalAmount ?? 0)} ${viewing.originalCurrency}` : "VND"} · {viewing.country}</p>
        </Modal>
      )}

      {editing && (
        <EditModal expense={editing} codes={codes} markup={markup} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}

      {deleting && (
        <Modal
          eyebrow="Delete expense"
          title="Delete this expense?"
          onClose={() => setDeleting(null)}
          footer={<><button className="btn" onClick={() => setDeleting(null)}>Cancel</button><button className="btn btn-danger" onClick={async () => { await deleteExpense(deleting.id); setDeleting(null); reload(); }}>Delete expense</button></>}
        >
          <p className="muted">The receipt photo and scan will also be removed. This cannot be undone.</p>
          <div className="del-card card">
            <strong>{editing?.description || deleting.description || "(no description)"}</strong>
            <div className="num muted">{vnd(deleting.amountVND)} · {fmtDate(deleting.date)} · {deleting.country}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditModal({ expense, codes, markup, onClose, onSaved }: { expense: Expense; codes: CountryCode[]; markup: number; onClose: () => void; onSaved: () => void }) {
  const [e, setE] = useState<Expense>(expense);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<Expense>) { setE((cur) => ({ ...cur, ...p })); }

  async function recalc() {
    if (!e.originalAmount || !e.originalCurrency || e.originalCurrency === "VND") return;
    setBusy(true); setRecalcMsg(null);
    try {
      const r = await getFx(e.originalCurrency);
      const eff = effectiveRate(r.rate, markup);
      const vndAmt = toVND(e.originalAmount, r.rate, markup);
      patch({ exchangeRate: eff, amountVND: vndAmt, rateSource: rateSource(markup), notes: conversionNote(e.originalAmount, e.originalCurrency, eff, vndAmt, markup) });
      setRecalcMsg(`Recalculated: ${vnd(vndAmt)}`);
    } catch (err) {
      setRecalcMsg(err instanceof ApiError ? err.message : "Rate unavailable");
    } finally { setBusy(false); }
  }

  async function save() {
    await updateExpense(e);
    onSaved();
  }

  return (
    <Modal eyebrow="Editing" title={expense.description || "Expense"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save changes</button></>}>
      <div className="edit-grid">
        <label className="field"><span className="field-label">Date</span><input className="input" type="date" value={e.date} onChange={(ev) => patch({ date: ev.target.value })} /></label>
        <label className="field"><span className="field-label">Country / account</span>
          <select className="select" value={e.country} onChange={(ev) => { const c = codes.find((x) => x.country === ev.target.value); patch({ country: ev.target.value, accountCode: c?.accountCode ?? e.accountCode }); }}>
            {codes.map((c) => <option key={c.id} value={c.country}>{c.country} · {c.accountCode}</option>)}
          </select>
        </label>
        <label className="field"><span className="field-label">Original amount</span><input className="input mono" inputMode="decimal" value={e.originalAmount ?? ""} onChange={(ev) => patch({ originalAmount: ev.target.value ? Number(ev.target.value) : null })} /></label>
        <label className="field"><span className="field-label">Currency</span><input className="input mono" value={e.originalCurrency ?? "VND"} onChange={(ev) => patch({ originalCurrency: ev.target.value.toUpperCase() })} /></label>
        <label className="field edit-full"><span className="field-label">Description</span><input className="input" value={e.description} onChange={(ev) => patch({ description: ev.target.value })} /></label>
        <label className="field"><span className="field-label">Amount (VND)</span><input className="input mono" inputMode="numeric" value={e.amountVND} onChange={(ev) => patch({ amountVND: Math.round(Number(ev.target.value) || 0) })} /></label>
        <div className="field">
          <span className="field-label">Re-convert</span>
          <button className="btn" disabled={busy || !e.originalCurrency || e.originalCurrency === "VND"} onClick={recalc}>{busy ? "…" : "Recalculate from rate"}</button>
        </div>
        <label className="field edit-full"><span className="field-label">Notes</span><textarea className="input" rows={2} value={e.notes} onChange={(ev) => patch({ notes: ev.target.value })} /></label>
      </div>
      {recalcMsg && <p className="muted edit-msg">{recalcMsg}</p>}
    </Modal>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
