import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listExpenses, listCountryCodes, updateExpense, deleteExpense, type ExpenseFilter } from "../data/repos";
import type { Expense, CountryCode } from "../data/types";
import { getFx, exportExpensesXlsx, base64ToBlob, ApiError } from "../lib/api";
import { toVND, effectiveRate, conversionNote, rateSource } from "../lib/currency";
import { getProfile } from "../data/repos";
import { vnd, money, num, fmtDate } from "../lib/format";
import { PageHeader, StatusChip, EmptyState, Modal, Banner } from "../components/ui";
import ReceiptViewer from "../components/ReceiptViewer";
import { useSyncSignal } from "../lib/sync";
import "./Expenses.css";

export default function Expenses() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Expense[]>([]);
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [markup, setMarkup] = useState(3);
  const [filter, setFilter] = useState<ExpenseFilter>({ status: "pending" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [editing, setEditing] = useState<Expense | null>(null);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  // ---- row selection ----
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(checked).filter((id) => checked[id]), [checked]);
  const selectedCount = selectedIds.length;
  const allChecked = rows.length > 0 && rows.every((e) => checked[e.id]);
  const someChecked = selectedCount > 0 && !allChecked;

  const toggleOne = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const toggleAll = () => {
    if (allChecked) setChecked({});
    else setChecked(Object.fromEntries(rows.map((e) => [e.id, true])));
  };
  const clearSelection = () => setChecked({});

  const synced = useSyncSignal();
  const reload = useCallback(() => { listExpenses(filter).then(setRows); }, [filter]);
  useEffect(() => { reload(); }, [reload, synced]);
  useEffect(() => {
    listCountryCodes().then(setCodes);
    getProfile().then((p) => setMarkup(p.currencyMarkupPct));
  }, []);

  // Clear stale selections when filter changes
  useEffect(() => { setChecked({}); }, [filter]);

  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort]);
  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "asc" }));
  }

  const total = rows.reduce((s, e) => s + e.amountVND, 0);
  const bases = new Set(rows.map((e) => e.baseCurrency || "VND"));
  const totalLabel = bases.size === 1 ? money(total, [...bases][0]) : num(total, 0);

  // Export the selected rows (or all filtered rows if nothing selected)
  async function exportXlsx() {
    const targets = selectedCount > 0 ? rows.filter((e) => checked[e.id]) : rows;
    if (targets.length === 0 || exporting) return;
    setExporting(true); setExportErr(null);
    try {
      const dates = targets.map((e) => e.date).sort();
      const bs = new Set(targets.map((e) => e.baseCurrency || "VND"));
      const res = await exportExpensesXlsx({
        baseCurrency: bs.size === 1 ? [...bs][0] : "VND",
        periodLabel: dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : "",
        expenses: targets.map((e) => ({ date: e.date, description: e.description, amountVND: e.amountVND, accountCode: e.accountCode })),
      });
      const blob = base64ToBlob(res.expenseXlsx.dataBase64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      downloadBlob(blob, res.expenseXlsx.filename);
    } catch (e) {
      setExportErr(e instanceof ApiError ? e.message : "Excel export failed.");
    } finally {
      setExporting(false);
    }
  }

  // Pass selected expense IDs to the Reports tab via sessionStorage
  function goToReport() {
    sessionStorage.setItem("mq:preselect", JSON.stringify(selectedIds));
    navigate("/reports");
  }

  return (
    <div className="expenses">
      <PageHeader
        title="Expenses"
        subtitle="All receipts captured on this device"
        right={
          <button className="btn" onClick={exportXlsx} disabled={rows.length === 0 || exporting}>
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
        }
      />

      {exportErr && <Banner kind="error" title="Couldn't export Excel" body={exportErr} />}

      <Link to="/capture" className="btn btn-primary exp-cap-cta">+ Capture a receipt</Link>

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
          <span className="filt-total num">{totalLabel}</span>
        </div>
      </div>

      {/* Selection action bar — only visible when rows are ticked */}
      {selectedCount > 0 && (
        <div className="sel-bar">
          <span className="sel-count">{selectedCount} selected</span>
          <button className="btn" onClick={exportXlsx} disabled={exporting}>{exporting ? "Exporting…" : "Export Excel"}</button>
          <button className="btn btn-primary" onClick={goToReport}>Create report →</button>
          <button className="btn btn-ghost sel-clear" onClick={clearSelection}>✕ Clear</button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No expenses yet" body="Capture your first receipt — we'll read it, convert the amount to VND, and store it here." action={<Link to="/capture" className="btn btn-primary">+ Capture a receipt</Link>} />
      ) : (
        <div className="exp-table card">
          <div className="exp-head">
            <span className="exp-chk-col">
              <input
                type="checkbox"
                className="exp-chk"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </span>
            <SortTh label="Date" k="date" sort={sort} onSort={toggleSort} />
            <span>Description</span><span>Original</span><span>Rate</span>
            <SortTh label="Amount" k="amountVND" sort={sort} onSort={toggleSort} className="ta-r" />
            <SortTh label="Country" k="country" sort={sort} onSort={toggleSort} />
            <SortTh label="Status" k="status" sort={sort} onSort={toggleSort} />
            <span />
          </div>
          {sorted.map((e) => (
            <div className={`exp-row${checked[e.id] ? " exp-row-sel" : ""}`} key={e.id} onClick={() => toggleOne(e.id)}>
              <span className="exp-chk-col" onClick={(ev) => ev.stopPropagation()}>
                <input type="checkbox" className="exp-chk" checked={!!checked[e.id]} onChange={() => toggleOne(e.id)} aria-label="Select" />
              </span>
              <span className="num exp-date">{fmtDate(e.date)}</span>
              <span className="exp-desc">{e.description || <em className="tertiary">(no description)</em>}</span>
              <span className="num exp-orig tertiary">{e.originalCurrency && e.originalCurrency !== (e.baseCurrency || "VND") ? `${num(e.originalAmount ?? 0)} ${e.originalCurrency}` : "—"}</span>
              <span className="num exp-rate tertiary">{e.exchangeRate ? num(e.exchangeRate, 0) : "1"}</span>
              <span className="num exp-vnd ta-r">{money(e.amountVND, e.baseCurrency)}</span>
              <span className="exp-cc tertiary">{e.country}</span>
              <span><StatusChip kind={e.status === "submitted" ? "submitted" : "pending"} /></span>
              <span className="exp-act" onClick={(ev) => ev.stopPropagation()}>
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
          <p className="muted vw-meta num">{money(viewing.amountVND, viewing.baseCurrency)} · {viewing.originalCurrency && viewing.originalCurrency !== (viewing.baseCurrency || "VND") ? `${num(viewing.originalAmount ?? 0)} ${viewing.originalCurrency}` : (viewing.baseCurrency || "VND")} · {viewing.country}</p>
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
            <div className="num muted">{money(deleting.amountVND, deleting.baseCurrency)} · {fmtDate(deleting.date)} · {deleting.country}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

type SortKey = "date" | "amountVND" | "country" | "status";

function sortRows(rows: Expense[], key: SortKey, dir: "asc" | "desc"): Expense[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let c = 0;
    if (key === "amountVND") c = a.amountVND - b.amountVND;
    else c = String(a[key]).localeCompare(String(b[key]));
    if (c === 0) c = b.createdAt - a.createdAt;
    return c * sign;
  });
}

function SortTh({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <button className={`exp-th${active ? " active" : ""}${className ? " " + className : ""}`} onClick={() => onSort(k)}>
      {label}{active && <span className="exp-th-ind" aria-hidden>{sort.dir === "asc" ? " ▲" : " ▼"}</span>}
    </button>
  );
}

function EditModal({ expense, codes, markup, onClose, onSaved }: { expense: Expense; codes: CountryCode[]; markup: number; onClose: () => void; onSaved: () => void }) {
  const [e, setE] = useState<Expense>(expense);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<Expense>) { setE((cur) => ({ ...cur, ...p })); }

  const base = e.baseCurrency || "VND";

  async function recalc() {
    if (!e.originalAmount || !e.originalCurrency || e.originalCurrency === base) return;
    setBusy(true); setRecalcMsg(null);
    try {
      const r = await getFx(e.originalCurrency, base);
      const eff = effectiveRate(r.rate, markup);
      const vndAmt = toVND(e.originalAmount, r.rate, markup);
      patch({ exchangeRate: eff, amountVND: vndAmt, rateSource: rateSource(markup), notes: conversionNote(e.originalAmount, e.originalCurrency, eff, vndAmt, markup, base) });
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
