import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProfile, listExpenses, listReports, getImageById, saveReport, markReportPaid, deleteReport, isProfileComplete, profileGaps,
} from "../data/repos";
import type { Profile, Expense, ExpenseReport } from "../data/types";
import { generateReport, blobToBase64, base64ToBlob, ApiError, type GenerateReportPayload } from "../lib/api";
import { db, uid } from "../data/db";
import { suggestInvoiceNumber } from "../lib/invoice";
import { vnd, fmtDate, fmtDateShort, periodLabel, todayISO } from "../lib/format";
import { PageHeader, StatusChip, EmptyState, Modal, Banner } from "../components/ui";
import "./Reports.css";

type Tab = "create" | "history";

export default function Reports() {
  const [tab, setTab] = useState<Tab>("create");
  return (
    <div className="reports">
      <PageHeader
        title={<span>Reports <span className="tertiary">/ {tab === "create" ? "Create" : "History"}</span></span>}
        subtitle={tab === "create" ? "Bundle unsubmitted expenses into a Macquarie submission package" : "Every submission package you've generated"}
        right={
          <div className="rep-tabs">
            <button className={`rep-tab${tab === "create" ? " active" : ""}`} onClick={() => setTab("create")}>Create</button>
            <button className={`rep-tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>History</button>
          </div>
        }
      />
      {tab === "create" ? <Create onDone={() => setTab("history")} /> : <History />}
    </div>
  );
}

// ---------------- Create ----------------

type CreateState = "form" | "generating" | "success" | "error";

function Create({ onDone }: { onDone: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [pending, setPending] = useState<Expense[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState(todayISO());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<CreateState>("form");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ report: ExpenseReport } | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
    listReports().then(setReports);
    listExpenses({ status: "pending" }).then(setPending);
  }, []);

  // suggested invoice number once profile + reports load
  useEffect(() => {
    if (profile && !invoiceNo) setInvoiceNo(suggestInvoiceNumber(reports, profile.invoicePrefix, todayISO()));
  }, [profile, reports, invoiceNo]);

  const inRange = useMemo(
    () => pending.filter((e) => (!start || e.date >= start) && (!end || e.date <= end)).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [pending, start, end],
  );
  // default-check everything in range
  useEffect(() => {
    setChecked((prev) => {
      const next: Record<string, boolean> = {};
      for (const e of inRange) next[e.id] = prev[e.id] ?? true;
      return next;
    });
  }, [inRange]);

  const selected = inRange.filter((e) => checked[e.id]);
  const total = selected.reduce((s, e) => s + e.amountVND, 0);
  const gaps = profile ? profileGaps(profile) : [];
  const complete = profile ? isProfileComplete(profile) : false;
  const canGenerate = complete && selected.length > 0 && !!invoiceNo.trim();

  async function generate() {
    if (!profile || !canGenerate) return;
    setState("generating"); setErrMsg(null);
    try {
      const receipts: GenerateReportPayload["receipts"] = [];
      for (const e of selected) {
        const img = await getImageById(e.bwScanId);
        if (img) receipts.push({ expenseRef: e.id, mimeType: img.mimeType, dataBase64: await blobToBase64(img.blob) });
      }
      const label = periodLabel(selected[0].date, selected[selected.length - 1].date);
      const payload: GenerateReportPayload = {
        profile,
        invoiceNumber: invoiceNo.trim(),
        periodLabel: label,
        baseCurrency: profile.baseCurrency || "VND",
        expenses: selected.map((e) => ({
          date: e.date, description: e.description, amountVND: e.amountVND, accountCode: e.accountCode, notes: e.notes,
          originalAmount: e.originalAmount, originalCurrency: e.originalCurrency, exchangeRate: e.exchangeRate, rateSource: e.rateSource,
        })),
        receipts,
      };
      const res = await generateReport(payload);
      const combinedPdf = base64ToBlob(res.combinedPdf.dataBase64, "application/pdf");
      const expenseXlsx = base64ToBlob(res.expenseXlsx.dataBase64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const report: ExpenseReport = {
        id: uid("rep_"), invoiceNumber: invoiceNo.trim(),
        periodStart: selected[0].date, periodEnd: selected[selected.length - 1].date, periodLabel: label,
        totalVND: total, expenseIds: selected.map((e) => e.id), status: "generated",
        generatedAt: Date.now(), paidAt: null, combinedPdf, expenseXlsx,
      };
      await saveReport(report);
      download(combinedPdf, res.combinedPdf.filename);
      download(expenseXlsx, res.expenseXlsx.filename);
      setResult({ report });
      setState("success");
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : "Report assembly failed.");
      setState("error");
    }
  }

  if (state === "generating") {
    return (
      <div className="gen-card card">
        <div className="eyebrow">Generating report</div>
        <h2 className="num">{invoiceNo}</h2>
        <p className="muted">{selected.length} expenses · {vnd(total)}</p>
        <div className="gen-bar"><span /></div>
        <ul className="gen-steps muted">
          <li>Reading receipts</li><li>Converting amounts</li><li>Building combined PDF</li><li>Writing Excel ledger</li><li>Stamping invoice number</li>
        </ul>
      </div>
    );
  }

  if (state === "success" && result) {
    return (
      <div className="gen-card card success">
        <div className="success-check">✓</div>
        <h2>Report ready to submit</h2>
        <p className="muted">Invoice <span className="num">{result.report.invoiceNumber}</span> · {result.report.periodLabel} · {vnd(result.report.totalVND)}</p>
        <p className="tertiary">Both files have downloaded. Email them to your Macquarie Finance contact.</p>
        <div className="gen-foot">
          <button className="btn" onClick={() => { setState("form"); setResult(null); setInvoiceNo(""); listReports().then(setReports); listExpenses({ status: "pending" }).then(setPending); }}>New report</button>
          <button className="btn btn-primary" onClick={onDone}>Go to History</button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="gen-card card">
        <Banner kind="error" title="Generation failed — nothing was changed" body={errMsg ?? undefined} />
        <p className="tertiary">No expenses were marked submitted and no files were downloaded.</p>
        <div className="gen-foot"><button className="btn btn-primary" onClick={() => setState("form")}>Back</button></div>
      </div>
    );
  }

  return (
    <div className="create">
      {!complete && (
        <Banner kind="attention" title="Finish Settings before generating a report" body={`Missing: ${gaps.join(", ")}.`} action={<Link to="/settings" className="btn">Go to Settings</Link>} />
      )}
      <div className="create-cfg card">
        <label className="field"><span className="field-label">Start date</span><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <span className="cfg-arrow">→</span>
        <label className="field"><span className="field-label">End date</span><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <label className="field cfg-inv"><span className="field-label">Invoice number</span><input className="input mono" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></label>
        <div className="cfg-sum">
          <span className="field-label">Will include</span>
          <span className="num cfg-total">{selected.length} · {vnd(total)}</span>
        </div>
      </div>

      <div className="create-list card">
        <div className="cl-head">
          <span className="eyebrow">Unsubmitted in range</span>
          <span className="tertiary">{selected.length} of {inRange.length} selected</span>
        </div>
        {inRange.length === 0 ? (
          <p className="muted cl-empty">No unsubmitted expenses in this date range.</p>
        ) : inRange.map((e) => (
          <label className="cl-row" key={e.id}>
            <input type="checkbox" checked={!!checked[e.id]} onChange={(ev) => setChecked((c) => ({ ...c, [e.id]: ev.target.checked }))} />
            <span className="num cl-date">{fmtDateShort(e.date)}</span>
            <span className="cl-desc">{e.description || "(no description)"}</span>
            <span className="tertiary cl-cc">{e.country}</span>
            <span className="num tertiary cl-orig">{e.originalCurrency && e.originalCurrency !== "VND" ? `${e.originalAmount} ${e.originalCurrency}` : "VND"}</span>
            <span className="num cl-vnd">{vnd(e.amountVND)}</span>
          </label>
        ))}
      </div>

      <div className="create-foot">
        {!canGenerate && complete && <span className="tertiary">{selected.length === 0 ? "Select at least one expense" : "Enter an invoice number"}</span>}
        <button className="btn btn-primary" disabled={!canGenerate} onClick={generate}>Generate report</button>
      </div>
    </div>
  );
}

// ---------------- History ----------------

function History() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [paying, setPaying] = useState<ExpenseReport | null>(null);
  const [removing, setRemoving] = useState<ExpenseReport | null>(null);
  const reload = () => listReports().then(setReports);
  useEffect(() => { reload(); }, []);

  async function redownload(r: ExpenseReport, which: "pdf" | "xlsx") {
    const fresh = await db.reports.get(r.id);
    const blob = which === "pdf" ? fresh?.combinedPdf : fresh?.expenseXlsx;
    if (blob) download(blob, `${r.invoiceNumber}-${which === "pdf" ? "submission.pdf" : "expenses.xlsx"}`);
  }

  if (reports.length === 0) {
    return <EmptyState title="No reports yet" body="When you bundle expenses for Macquarie Finance, the generated PDF and Excel show up here so you can re-download or mark them paid." action={<span className="tertiary">Create one from the Create tab.</span>} />;
  }

  const awaiting = reports.filter((r) => r.status === "generated");
  const paid = reports.filter((r) => r.status === "paid");

  return (
    <div className="history">
      <div className="hist-stats">
        <Stat k="Total reports" v={String(reports.length)} />
        <Stat k="Awaiting payment" v={String(awaiting.length)} sub={vnd(awaiting.reduce((s, r) => s + r.totalVND, 0))} />
        <Stat k="Paid" v={String(paid.length)} sub={vnd(paid.reduce((s, r) => s + r.totalVND, 0))} />
      </div>
      <div className="hist-table card">
        <div className="hist-head"><span>Period</span><span>Invoice #</span><span className="ta-r">Total VND</span><span>Generated</span><span>Status</span><span /></div>
        {reports.map((r) => (
          <div className="hist-row" key={r.id}>
            <span className="hist-period">{r.periodLabel}</span>
            <span className="num">{r.invoiceNumber}</span>
            <span className="num ta-r">{vnd(r.totalVND)}</span>
            <span className="tertiary num">{fmtDate(new Date(r.generatedAt).toISOString().slice(0, 10))}</span>
            <span><StatusChip kind={r.status === "paid" ? "paid" : "generated"} /></span>
            <span className="hist-act">
              <button className="btn btn-ghost ico" title="Re-download PDF" onClick={() => redownload(r, "pdf")}>PDF</button>
              <button className="btn btn-ghost ico" title="Re-download Excel" onClick={() => redownload(r, "xlsx")}>XLS</button>
              {r.status === "generated" && <button className="btn btn-ghost ico" title="Mark paid" onClick={() => setPaying(r)}>✓</button>}
              {r.status === "generated" && <button className="btn btn-ghost ico" title="Delete (returns expenses)" onClick={() => setRemoving(r)}>✕</button>}
            </span>
          </div>
        ))}
      </div>

      {paying && (
        <Modal eyebrow="Mark report as paid" title={`Did Macquarie pay ${paying.invoiceNumber}?`} onClose={() => setPaying(null)}
          footer={<><button className="btn" onClick={() => setPaying(null)}>Not yet</button><button className="btn btn-primary" onClick={async () => { await markReportPaid(paying.id); setPaying(null); reload(); }}>Yes, mark paid</button></>}>
          <p className="muted">Marking as Paid locks the report — it can't be edited or deleted afterward.</p>
          <div className="del-card card"><strong className="num">{paying.invoiceNumber}</strong><div className="num muted">{paying.periodLabel} · {vnd(paying.totalVND)}</div></div>
        </Modal>
      )}
      {removing && (
        <Modal eyebrow="Delete report" title="Delete this report?" onClose={() => setRemoving(null)}
          footer={<><button className="btn" onClick={() => setRemoving(null)}>Cancel</button><button className="btn btn-danger" onClick={async () => { await deleteReport(removing.id); setRemoving(null); reload(); }}>Delete & unlock expenses</button></>}>
          <p className="muted">Its {removing.expenseIds.length} expenses go back to Unsubmitted so you can regenerate. The downloaded files on your computer are not affected.</p>
        </Modal>
      )}
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return <div className="hist-stat card"><div className="eyebrow">{k}</div><div className="num hist-stat-v">{v}</div>{sub && <div className="tertiary num">{sub}</div>}</div>;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
