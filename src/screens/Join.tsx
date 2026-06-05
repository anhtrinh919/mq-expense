import { useEffect, useState } from "react";
import { register } from "../lib/authClient";
import { ApiError } from "../lib/api";
import "./Onboarding.css";
import "./Login.css";

type InviteState = "checking" | "valid" | "invalid";

// Full-bleed invite onboarding. Reads ?invite=<token>, validates it, then creates the account.
export default function Join({ token, onAuthed }: { token: string; onAuthed: () => void }) {
  const [state, setState] = useState<InviteState>("checking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/invites/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { status: string; email?: string }) => {
        if (!alive) return;
        if (d.status === "pending") {
          setState("valid");
          if (d.email) setEmail(d.email);
        } else setState("invalid");
      })
      .catch(() => alive && setState("invalid"));
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Please enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("Please enter a valid email.");
    if (!/^\d{4,8}$/.test(pin)) return setErr("Your PIN needs 4 to 8 digits.");
    if (pin !== confirm) return setErr("Those two PINs don't match.");
    setBusy(true);
    try {
      await register({ inviteToken: token, name: name.trim(), email: email.trim(), pin });
      onAuthed();
    } catch (x) {
      const status = x instanceof ApiError ? x.status : 0;
      if (status === 409) setErr("That email already has an account. Try logging in instead.");
      else if (status === 403) setErr("This invite link isn't valid anymore. Ask your manager for a fresh one.");
      else if (status === 400) setErr(x instanceof ApiError ? x.message : "Please check your details.");
      else setErr("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onb">
      <div className="onb-card">
        <div className="onb-brand">MQ Expense</div>

        {state === "checking" && (
          <div className="onb-body" style={{ alignItems: "center", textAlign: "center" }}>
            <p className="onb-sub muted">Checking your invite…</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="onb-body">
            <h1 className="onb-title serif">Link no longer valid</h1>
            <p className="onb-sub muted">
              This invite link has expired or has already been used. Ask your manager to send you a fresh one.
            </p>
          </div>
        )}

        {state === "valid" && (
          <form className="onb-body" onSubmit={submit}>
            <h1 className="onb-title serif">You're invited</h1>
            <p className="onb-sub muted">
              Set up your own private workspace. Nobody else, not even your manager, can see what's inside it.
            </p>
            <label className="onb-label">Your name</label>
            <input className="onb-input" value={name} autoFocus onChange={(e) => { setName(e.target.value); setErr(null); }} />
            <label className="onb-label">Email</label>
            <input className="onb-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} />
            <label className="onb-label">Choose a PIN (4–8 digits)</label>
            <input className="onb-input num" type="password" inputMode="numeric" value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} />
            <label className="onb-label">Confirm your PIN</label>
            <input className="onb-input num" type="password" inputMode="numeric" value={confirm}
              onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} />
            {err && <p className="onb-err">{err}</p>}
            <button className="btn btn-primary onb-go" type="submit" disabled={busy}>Create my workspace</button>
            <p className="onb-sub tertiary" style={{ textAlign: "center", fontSize: 12.5 }}>
              Your data is yours alone, synced privately across your devices.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
