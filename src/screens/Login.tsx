import { useState } from "react";
import { login, verifyLocalPin } from "../lib/authClient";
import { ApiError } from "../lib/api";
import "./PinLock.css";
import "./Login.css";

type Mode = "login" | "unlock";

// Full-bleed login / quick-unlock. Login = email + PIN (gets a session). Unlock = PIN only,
// checked locally against the hash saved at login. No email reset — forgot PIN points to the admin.
export default function Login({
  initialMode,
  knownName,
  knownEmail,
  onAuthed,
}: {
  initialMode: Mode;
  knownName?: string | null;
  knownEmail?: string | null;
  onAuthed: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState(knownEmail ?? "");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const first = (knownName || "").trim().split(/\s+/)[0] || "";

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login({ email: email.trim(), pin });
      onAuthed();
    } catch (x) {
      const status = x instanceof ApiError ? x.status : 0;
      if (status === 423) setErr("Too many tries. Try again in a few minutes.");
      else if (status === 403) setErr("Your access has been turned off. Contact your manager.");
      else if (status === 401) setErr("Wrong email or PIN.");
      else setErr("Couldn't reach the server. Check your connection and try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await verifyLocalPin(pin);
    setBusy(false);
    if (ok) onAuthed();
    else {
      setErr("That PIN didn't match.");
      setPin("");
    }
  }

  if (forgot) {
    return (
      <Shell>
        <h1 className="pin-title serif">Reset your PIN</h1>
        <div className="auth-note">
          There's no email reset on this app. Message your administrator and they'll reset your PIN for
          you. Your data stays exactly as it is.
        </div>
        <button type="button" className="pin-link" onClick={() => { setForgot(false); setErr(null); }}>
          ← Back to login
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      {mode === "unlock" ? (
        <form onSubmit={doUnlock} className="pin-form">
          <h1 className="pin-title serif">{first ? `Welcome back, ${first}.` : "Welcome back."}</h1>
          <p className="pin-sub muted">Enter your PIN to unlock.</p>
          <PinField pin={pin} setPin={(v) => { setPin(v); setErr(null); }} label="PIN" />
          {err && <p className="pin-err">{err}</p>}
          <button className="btn btn-primary pin-go" type="submit" disabled={busy || pin.length < 4}>Unlock</button>
          <div className="login-links">
            <button type="button" className="pin-link" onClick={() => { setMode("login"); setErr(null); }}>Log in with email instead</button>
            <button type="button" className="pin-link" onClick={() => { setForgot(true); setErr(null); }}>Forgot PIN?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={doLogin} className="pin-form">
          <h1 className="pin-title serif">Log in</h1>
          <p className="pin-sub muted">Sign in to sync this device with your workspace.</p>
          <label className="pin-label">Email</label>
          <input
            className="login-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(null); }}
            aria-label="Email"
          />
          <label className="pin-label">PIN</label>
          <PinField pin={pin} setPin={(v) => { setPin(v); setErr(null); }} label="PIN" />
          {err && <p className="pin-err">{err}</p>}
          <button className="btn btn-primary pin-go" type="submit" disabled={busy || pin.length < 4 || !email.trim()}>Log in</button>
          <button type="button" className="pin-link" onClick={() => { setForgot(true); setErr(null); }}>Forgot PIN?</button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pinlock">
      <div className="pin-card">
        <div className="pin-brand">MQ Expense</div>
        {children}
        <div className="pin-local">ENCRYPTED · SYNCED PRIVATELY</div>
      </div>
    </div>
  );
}

function PinField({ pin, setPin, label }: { pin: string; setPin: (v: string) => void; label: string }) {
  return (
    <input
      className="pin-input num"
      type="password"
      inputMode="numeric"
      autoFocus
      autoComplete="off"
      value={pin}
      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
      aria-label={label}
    />
  );
}
