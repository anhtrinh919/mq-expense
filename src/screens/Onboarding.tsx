import { useState, useRef } from "react";
import { getProfile, saveProfile, seedCountryCodesIfEmpty } from "../data/repos";
import { hashPin, isValidPin } from "../lib/pin";
import { importAll } from "../lib/backup";
import { COUNTRY_OPTIONS, CURRENCIES, currencyForCountry, currencyLabel } from "../lib/countries";
import "./Onboarding.css";

type Step = "welcome" | "details" | "pin" | "done" | "restore";

// Full-bleed first-run wizard. Collects only the essentials, then lands the user ready to capture.
// skipPin: the account already set a PIN at login (Phase 3), so the soft-lock step is redundant.
export default function Onboarding({ onDone, skipPin = false, defaultName = "" }: { onDone: () => void; skipPin?: boolean; defaultName?: string }) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState(defaultName);
  const [country, setCountry] = useState("Vietnam");
  const [currency, setCurrency] = useState("VND");
  const [currencyEdit, setCurrencyEdit] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function chooseCountry(c: string) {
    setCountry(c);
    if (!currencyEdit) setCurrency(currencyForCountry(c));
  }

  /** Persist the collected profile + seed country codes, then show the Done guide. */
  async function finishToGuide(pinHash: string | null) {
    setBusy(true);
    const p = await getProfile();
    await saveProfile({
      ...p,
      submitter: { ...p.submitter, name: name.trim() },
      homeCountry: country,
      baseCurrency: currency,
      pinHash,
      onboardingComplete: true,
    });
    await seedCountryCodesIfEmpty();
    setBusy(false);
    setStep("done");
  }

  async function submitPin() {
    if (!isValidPin(pin)) { setErr("Use 4–8 digits."); return; }
    if (pin !== confirm) { setErr("Those two don't match."); return; }
    await finishToGuide(await hashPin(pin));
  }

  return (
    <div className="onb">
      <div className="onb-card">
        <div className="onb-brand">MQ Expense</div>

        {step === "welcome" && (
          <div className="onb-body">
            <h1 className="onb-title serif">Welcome to MQ Expense.</h1>
            <p className="onb-sub muted">A calm tracker for your Macquarie expenses.</p>
            <ul className="onb-points">
              <li>Snap a receipt — we read the date and total.</li>
              <li>We convert any currency to your reimbursement currency.</li>
              <li>Your data stays on this device — always.</li>
            </ul>
            <button className="btn btn-primary onb-go" onClick={() => setStep("details")}>Get started</button>
            <button className="onb-link" onClick={() => setStep("restore")}>Restore from a backup instead</button>
          </div>
        )}

        {step === "details" && (
          <div className="onb-body">
            <div className="onb-prog">1 / 3</div>
            <h1 className="onb-title serif">A few quick details.</h1>
            <p className="onb-sub muted">You can change any of this later in Profile.</p>

            <label className="onb-label">Your name</label>
            <input className="onb-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />

            <label className="onb-label">Home country</label>
            <select className="onb-input" value={country} onChange={(e) => chooseCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map((o) => <option key={o.country} value={o.country}>{o.country}</option>)}
            </select>

            <label className="onb-label">Reimbursement currency</label>
            {currencyEdit ? (
              <select className="onb-input num" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}
              </select>
            ) : (
              <div className="onb-ccy">
                <span className="num">{currencyLabel(currency)}</span>
                <button className="onb-link" onClick={() => setCurrencyEdit(true)}>Change</button>
              </div>
            )}
            <p className="onb-hint muted">Set from your home country. Override if you reimburse in a different currency.</p>

            <div className="onb-nav">
              <button className="btn btn-ghost" onClick={() => setStep("welcome")}>Back</button>
              <button className="btn btn-primary" disabled={!name.trim()} onClick={() => skipPin ? void finishToGuide(null) : setStep("pin")}>Continue</button>
            </div>
          </div>
        )}

        {step === "pin" && (
          <div className="onb-body">
            <div className="onb-prog">2 / 3</div>
            <h1 className="onb-title serif">Add a soft lock?</h1>
            <p className="onb-sub muted">Optional. A short PIN keeps casual eyes off your receipts — your data is on this device either way.</p>

            <label className="onb-label">Enter a 4–8 digit PIN</label>
            <input className="onb-input num" type="password" inputMode="numeric" autoComplete="off" value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} />
            <label className="onb-label">Confirm PIN</label>
            <input className="onb-input num" type="password" inputMode="numeric" autoComplete="off" value={confirm}
              onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(null); }} />
            <p className="onb-hint muted">Keep it memorable — there's no email recovery. If you forget it you can reset and keep your data.</p>
            {err && <p className="onb-err">{err}</p>}

            <div className="onb-nav">
              <button className="btn btn-ghost" onClick={() => setStep("details")}>Back</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => void finishToGuide(null)}>Skip for now</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void submitPin()}>Set PIN</button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="onb-body">
            <h1 className="onb-title serif">You're set{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ""}.</h1>
            <p className="onb-sub muted">A quick guide before your first receipt:</p>
            <ol className="onb-guide">
              <li><span className="onb-num num">1</span> Snap or drop a receipt on the Capture screen. We'll read the date and total.</li>
              <li><span className="onb-num num">2</span> Review the values; tap Save.</li>
              <li><span className="onb-num num">3</span> At month end, pick a date range and download one zip for Finance.</li>
            </ol>
            <div className="onb-nav">
              <button className="btn btn-primary onb-go" onClick={onDone}>Go to Capture</button>
            </div>
          </div>
        )}

        {step === "restore" && <RestoreStep onCancel={() => setStep("welcome")} onDone={onDone} />}

        <div className="onb-local">LOCAL · THIS DEVICE</div>
      </div>
    </div>
  );
}

function RestoreStep({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      await importAll(file);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That file isn't a valid backup.");
      setBusy(false);
    }
  }

  return (
    <div className="onb-body">
      <div className="onb-prog">Restore</div>
      <h1 className="onb-title serif">Bring your data back.</h1>
      <p className="onb-sub muted">Drop in a .mqx file from your old device — we'll replace anything on this one.</p>
      <input ref={input} type="file" accept=".mqx,application/json" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      <button className="btn" disabled={busy} onClick={() => input.current?.click()}>Choose file</button>
      <p className="onb-hint muted">This will replace any data already on this device.</p>
      {err && <p className="onb-err">{err}</p>}
      <div className="onb-nav">
        <button className="onb-link" onClick={onCancel}>Cancel — start fresh instead</button>
      </div>
    </div>
  );
}
