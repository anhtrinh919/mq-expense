import { useState } from "react";
import { getProfile, saveProfile } from "../data/repos";
import { hashPin, verifyPin, isValidPin } from "../lib/pin";
import "./PinLock.css";

// Full-bleed soft lock shown on app open when a PIN is set. Resetting never touches data.
export default function PinLock({
  pinHash,
  name,
  onUnlock,
}: {
  pinHash: string;
  name: string;
  onUnlock: () => void;
}) {
  const [mode, setMode] = useState<"enter" | "reset">("enter");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await verifyPin(pin, pinHash);
    setBusy(false);
    if (ok) onUnlock();
    else { setErr("That PIN doesn't match. Try again."); setPin(""); }
  }

  async function setNew(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPin(newPin)) { setErr("Use 4–8 digits."); return; }
    if (newPin !== confirm) { setErr("Those two don't match."); return; }
    setBusy(true);
    const p = await getProfile();
    await saveProfile({ ...p, pinHash: await hashPin(newPin) });
    setBusy(false);
    onUnlock();
  }

  async function removePin() {
    setBusy(true);
    const p = await getProfile();
    await saveProfile({ ...p, pinHash: null });
    setBusy(false);
    onUnlock();
  }

  return (
    <div className="pinlock">
      <div className="pin-card">
        <div className="pin-brand">MQ Expense</div>

        {mode === "enter" ? (
          <form onSubmit={tryUnlock} className="pin-form">
            <h1 className="pin-title serif">{name ? `Welcome back, ${name}.` : "Welcome back."}</h1>
            <p className="pin-sub muted">Enter your PIN to unlock.</p>
            <input
              className="pin-input num"
              type="password"
              inputMode="numeric"
              autoFocus
              autoComplete="off"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }}
              aria-label="PIN"
            />
            {err && <p className="pin-err">{err}</p>}
            <button className="btn btn-primary pin-go" type="submit" disabled={busy || pin.length < 4}>Unlock</button>
            <button type="button" className="pin-link" onClick={() => { setMode("reset"); setErr(null); }}>Forgot PIN?</button>
          </form>
        ) : (
          <form onSubmit={setNew} className="pin-form">
            <h1 className="pin-title serif">Reset your PIN.</h1>
            <p className="pin-sub muted">
              Your data stays exactly where it is — only the PIN itself changes. All expenses, receipts, and settings remain on this device.
            </p>
            <label className="pin-label">Set a new 4–8 digit PIN</label>
            <input
              className="pin-input num"
              type="password"
              inputMode="numeric"
              autoFocus
              autoComplete="off"
              value={newPin}
              onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }}
              aria-label="New PIN"
            />
            <label className="pin-label">Confirm it</label>
            <input
              className="pin-input num"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }}
              aria-label="Confirm PIN"
            />
            {err && <p className="pin-err">{err}</p>}
            <button className="btn btn-primary pin-go" type="submit" disabled={busy}>Set new PIN</button>
            <button type="button" className="pin-link" onClick={removePin} disabled={busy}>
              Or remove the PIN — unlock with no PIN from now on
            </button>
          </form>
        )}

        <div className="pin-local">LOCAL · THIS DEVICE</div>
      </div>
    </div>
  );
}
