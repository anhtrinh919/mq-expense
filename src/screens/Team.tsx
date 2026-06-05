import { useEffect, useState, useCallback } from "react";
import { authHeaders } from "../lib/api";
import "./Team.css";

interface Member {
  accountId: string;
  name: string;
  email: string;
  status: "active" | "disabled";
  joinedAt: number;
}

export default function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRoster = useCallback(async () => {
    const res = await fetch("/api/team/roster", { headers: authHeaders() });
    if (res.ok) setMembers(((await res.json()).members ?? []) as Member[]);
  }, []);

  useEffect(() => { void loadRoster(); }, [loadRoster]);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/invites", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: "{}" });
    setBusy(false);
    if (res.ok) { setLink((await res.json()).link as string); setCopied(false); }
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  }

  async function revoke(id: string) {
    setBusy(true);
    await fetch(`/api/team/${id}/disable`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: "{}" });
    setBusy(false);
    setConfirmId(null);
    void loadRoster();
  }

  return (
    <div className="team-page">
      <div className="eyebrow">Manager</div>
      <h1 className="serif team-title">Invite &amp; Team</h1>
      <p className="team-sub muted">Generate a link to invite a teammate. Everyone's expenses stay private — you only see who has joined.</p>

      <section className="card team-card">
        <h2 className="serif">Invite a teammate</h2>
        <p className="muted team-card-sub">Share a link. It works once and expires in 7 days.</p>
        {link ? (
          <>
            <div className="invite-link">
              <input className="num" value={link} readOnly aria-label="Invite link" />
              <button className="btn btn-primary" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
            </div>
            <button className="pin-link team-regen" onClick={generate} disabled={busy}>Generate another</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={generate} disabled={busy}>Generate invite link</button>
        )}
      </section>

      <section className="card team-card">
        <h2 className="serif">Teammates</h2>
        {members.length === 0 ? (
          <div className="team-empty">
            <p className="muted">No teammates yet. Generate a link and share it to get someone started.</p>
          </div>
        ) : (
          <div className="roster">
            {members.map((m) => (
              <div className="roster-row" key={m.accountId}>
                <div className="who">
                  <div className="rn">{m.name}</div>
                  <div className="re">{m.email}</div>
                </div>
                {m.status === "active" ? <span className="chip chip-paid">Active</span> : <span className="chip chip-disabled">Disabled</span>}
                <span className="rj">joined {new Date(m.joinedAt).toLocaleDateString()}</span>
                {m.status === "active" && (
                  confirmId === m.accountId ? (
                    <span className="confirm-inline">
                      <span className="tertiary">Revoke access?</span>
                      <button className="btn btn-danger btn-sm" onClick={() => revoke(m.accountId)} disabled={busy}>Yes</button>
                      <button className="pin-link" onClick={() => setConfirmId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button className="revoke" onClick={() => setConfirmId(m.accountId)}>Revoke</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
