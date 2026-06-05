import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/ui";
import { exportAll, importAll } from "../lib/backup";
import { getAccount, logout, wipeWorkspace, saveAccount } from "../lib/authClient";
import { authHeaders, ApiError } from "../lib/api";
import { hashPin, isValidPin } from "../lib/pin";
import type { AccountState } from "../data/types";
import "./Settings.css";

// Account + data home (renamed from the Phase 2 "Backup" page): who you're signed in as,
// export/restore, change PIN, and the danger zone.
export default function Settings() {
  const [account, setAccount] = useState<AccountState | null>(null);
  useEffect(() => { void getAccount().then(setAccount); }, []);

  return (
    <div className="settings">
      <PageHeader title="Settings" subtitle="Your account, your backups, your data" />
      <div className="setup-grid">
        <AccountSection account={account} />
        <ExportSection />
        <RestoreSection />
        <SecuritySection />
        <DangerSection />
      </div>
    </div>
  );
}

function AccountSection({ account }: { account: AccountState | null }) {
  async function doLogout() {
    await logout();
    window.location.assign("/");
  }
  return (
    <section className="card setup-section">
      <h3 className="section-title">Account</h3>
      <p className="section-hint tertiary">Signed in on this device. Logging out keeps your data here and re-syncs next time.</p>
      <div className="acct-line">
        <div>
          <div className="acct-name-lg">{account?.name || "You"}</div>
          <div className="tertiary mono acct-mail-lg">{account?.email}</div>
        </div>
        <button className="btn" onClick={() => void doLogout()}>Log out</button>
      </div>
    </section>
  );
}

function ExportSection() {
  async function doExport() {
    const { blob, filename } = await exportAll();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="card setup-section">
      <h3 className="section-title">Backup</h3>
      <p className="section-hint tertiary">Keep your own copy as a single <span className="mono">.mqx</span> file, in addition to automatic cloud sync.</p>
      <div className="sec-actions">
        <button className="btn btn-primary" onClick={() => void doExport()}>Export all my data</button>
      </div>
    </section>
  );
}

function RestoreSection() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      const counts = await importAll(file);
      setMsg(`Restored ${counts.expenses} expenses, ${counts.reports} reports, ${counts.images} images. Reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That file isn't a valid backup.");
      setBusy(false);
    }
  }

  return (
    <section className="card setup-section">
      <h3 className="section-title">Restore from a backup</h3>
      <p className="section-hint tertiary">Bring data back from a <span className="mono">.mqx</span> file (e.g. moving to a new device).</p>
      <input ref={input} type="file" accept=".mqx,application/json" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <div className="sec-actions">
        <button className="btn" disabled={busy} onClick={() => input.current?.click()}>Choose backup file</button>
      </div>
      <p className="restore-warn">This replaces all data currently on this device.</p>
      {msg && <p className="sec-note">{msg}</p>}
      {err && <p className="restore-warn">{err}</p>}
    </section>
  );
}

function SecuritySection() {
  const [editing, setEditing] = useState(false);
  const [cur, setCur] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function change() {
    setErr(null);
    if (!isValidPin(pin)) return setErr("New PIN must be 4–8 digits.");
    if (pin !== confirm) return setErr("Those two don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ currentPin: cur, newPin: pin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const msg =
          res.status === 401
            ? data.error === "session expired" || data.error === "not signed in"
              ? "You're signed out — log in again, then change your PIN."
              : "Your current PIN didn't match."
            : data.error || "Couldn't change PIN. Try again.";
        throw new ApiError(res.status, msg);
      }
      // Server is the source of truth — it already changed the PIN. Updating the local
      // quick-unlock hash must never turn that success into a visible failure.
      try {
        await saveAccount({ pinHashLocal: await hashPin(pin) });
      } catch {
        /* local hash refresh failed; the new PIN still works via the server */
      }
      setEditing(false); setDone(true); setCur(""); setPin(""); setConfirm("");
    } catch (e) {
      setErr(e instanceof ApiError && e.message ? e.message : "Couldn't change PIN. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card setup-section">
      <h3 className="section-title">Security</h3>
      <p className="section-hint tertiary">Your PIN unlocks the app and is your login secret. Forgot it? Ask your administrator to reset it.</p>
      {editing ? (
        <>
          <Field label="Current PIN"><input className="input num" type="password" inputMode="numeric" value={cur} onChange={(e) => { setCur(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} /></Field>
          <Field label="New 4–8 digit PIN"><input className="input num" type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} /></Field>
          <Field label="Confirm new PIN"><input className="input num" type="password" inputMode="numeric" value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} /></Field>
          {err && <p className="restore-warn">{err}</p>}
          <div className="sec-actions">
            <button className="btn btn-primary" onClick={() => void change()} disabled={busy}>Save PIN</button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setErr(null); }}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="sec-actions">
          <button className="btn" onClick={() => { setEditing(true); setDone(false); }}>Change PIN</button>
          {done && <span className="sec-note">PIN changed.</span>}
        </div>
      )}
    </section>
  );
}

function DangerSection() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function clearAll() {
    setBusy(true);
    await fetch("/api/account/data", { method: "DELETE", headers: authHeaders() }).catch(() => undefined);
    await wipeWorkspace();
    // Reset sync cursors so a later sync starts clean.
    await saveAccount({ pullCursor: 0, pushHigh: 0 });
    window.location.assign("/");
  }

  return (
    <section className="card setup-section danger-section">
      <h3 className="section-title">Danger zone</h3>
      <p className="section-hint">Erase every expense, receipt, and report on this device and in your synced copy. This can't be undone. Your account stays.</p>
      {confirming ? (
        <div className="sec-actions">
          <span className="muted">Clear all my data?</span>
          <button className="btn btn-danger" onClick={() => void clearAll()} disabled={busy}>Yes, clear everything</button>
          <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <div className="sec-actions">
          <button className="btn btn-danger" onClick={() => setConfirming(true)}>Clear all my data</button>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
