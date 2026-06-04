import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listExpenses, listReports } from "../data/repos";
import type { Expense, ExpenseReport } from "../data/types";
import { vnd, fmtDateShort } from "../lib/format";
import "./Home.css";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);

  useEffect(() => {
    listExpenses().then(setExpenses);
    listReports().then(setReports);
  }, []);

  const unsubmitted = expenses.filter((e) => e.status === "pending");
  const unsubmittedSum = unsubmitted.reduce((s, e) => s + e.amountVND, 0);
  const allSum = expenses.reduce((s, e) => s + e.amountVND, 0);
  const awaiting = reports.filter((r) => r.status === "generated");
  const awaitingSum = awaiting.reduce((s, r) => s + r.totalVND, 0);
  const lastAwaiting = awaiting[0];
  const recent = expenses.slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="home">
      <section className="greet">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="greet-title serif">{greeting}.</h1>
          <p className="muted">
            {unsubmitted.length > 0
              ? `${unsubmitted.length} receipt${unsubmitted.length === 1 ? "" : "s"} waiting to be reported.`
              : "Everything's logged. Capture a receipt or generate a report."}
          </p>
        </div>
        <Link to="/capture" className="btn btn-primary greet-cta">+ Add receipts</Link>
      </section>

      <section className="quick">
        <StatCard k="Unsubmitted" big={String(unsubmitted.length)} sub={vnd(unsubmittedSum)} note="Capture or fix before generating" to="/expenses" />
        <StatCard k="All expenses" big={String(expenses.length)} sub={vnd(allSum)} note="Everything on this device" to="/expenses" />
        <StatCard
          k="Pending payment"
          big={lastAwaiting ? lastAwaiting.invoiceNumber : "—"}
          sub={lastAwaiting ? vnd(awaitingSum) : "No reports awaiting"}
          note={awaiting.length > 1 ? `${awaiting.length} reports awaiting payment` : "Mark paid in Reports → History"}
          to="/reports"
        />
      </section>

      <section className="recent card">
        <div className="recent-head">
          <h2>Recent expenses</h2>
          <Link to="/expenses" className="muted">See all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="muted recent-empty">No expenses yet. <Link to="/capture" className="link-accent">Capture your first receipt →</Link></p>
        ) : (
          <ul className="recent-list">
            {recent.map((e) => (
              <li key={e.id} className="recent-row">
                <span className="num recent-date">{fmtDateShort(e.date)}</span>
                <span className="recent-desc">{e.description || "(no description)"}</span>
                <span className="recent-cc tertiary">{e.country}</span>
                <span className="num recent-amt">{vnd(e.amountVND)}</span>
                <span className={`chip chip-${e.status === "submitted" ? "submitted" : "unsubmitted"}`}>
                  {e.status === "submitted" ? "Submitted" : "Unsubmitted"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ k, big, sub, note, to }: { k: string; big: string; sub: string; note: string; to: string }) {
  return (
    <Link to={to} className="stat-card card">
      <div className="eyebrow">{k}</div>
      <div className="stat-row">
        <span className="num stat-big">{big}</span>
        <span className="num stat-sub muted">{sub}</span>
      </div>
      <p className="tertiary stat-note">{note}</p>
    </Link>
  );
}
