import { useEffect, useRef, useState } from "react";
import {
  getProfile,
  saveProfile,
  listCountryCodes,
  upsertCountryCode,
  deleteCountryCode,
  newCountryCode,
  profileGaps,
} from "../data/repos";
import type { Profile, CountryCode } from "../data/types";
import { PageHeader, Banner } from "../components/ui";
import { COUNTRY_OPTIONS, CURRENCIES, currencyForCountry, currencyLabel } from "../lib/countries";
import { loadDraft, saveDraft, clearDraft } from "../lib/formDraft";
import "./Settings.css";

const DRAFT_KEY = "mqx:draft:profile";

// Your details — profile, invoice recipient, bank, base currency, country codes. Feeds every
// report. (Renamed from the Phase 2 "Settings" page; PIN + Restore moved to the new Settings.)
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [restored, setRestored] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    getProfile().then((p) => {
      const draft = loadDraft<Profile>(DRAFT_KEY);
      if (draft) { setProfile(draft); setRestored(true); }
      else setProfile(p);
    });
    listCountryCodes().then(setCodes);
  }, []);

  useEffect(() => {
    if (!profile || !dirty.current) return;
    const t = setTimeout(() => saveDraft(DRAFT_KEY, profile), 400);
    return () => clearTimeout(t);
  }, [profile]);

  if (!profile) return null;
  const gaps = profileGaps(profile);

  function patch(p: Partial<Profile>) {
    dirty.current = true;
    setProfile((cur) => (cur ? { ...cur, ...p } : cur));
  }
  function patchSub<K extends keyof Profile>(key: K, sub: Partial<Profile[K]>) {
    dirty.current = true;
    setProfile((cur) => (cur ? { ...cur, [key]: { ...(cur[key] as object), ...sub } } : cur));
  }

  async function save() {
    if (!profile) return;
    await saveProfile(profile);
    for (const c of codes) await upsertCountryCode(c);
    clearDraft(DRAFT_KEY);
    dirty.current = false;
    setRestored(false);
    setSavedAt(Date.now());
    setProfile({ ...profile, updatedAt: Date.now() });
  }

  function chooseCountry(c: string) {
    patch({ homeCountry: c, baseCurrency: currencyForCountry(c) });
  }

  function addCode() { setCodes((cur) => [...cur, newCountryCode(cur.length)]); }
  function patchCode(id: string, p: Partial<CountryCode>) { setCodes((cur) => cur.map((c) => (c.id === id ? { ...c, ...p } : c))); }
  async function removeCode(id: string) { await deleteCountryCode(id); setCodes((cur) => cur.filter((c) => c.id !== id)); }

  const invalid = (cond: boolean) => (showErrors && cond ? "input invalid" : "input");

  return (
    <div className="settings">
      <PageHeader
        title="Profile"
        subtitle="Your details · feeds every report"
        right={
          <div className="save-area">
            {savedAt && <span className="saved-pill"><span className="dot" /> All changes saved</span>}
            <button className="btn btn-primary" onClick={save}>Save changes</button>
          </div>
        }
      />

      {restored && (
        <Banner kind="attention" title="Restored your unsaved edits" body="Picked up changes you hadn't saved before the page reloaded. Save when you're happy with them." />
      )}

      {gaps.length > 0 && (
        <Banner
          kind="attention"
          title="A report will need a few more details"
          body={`Before you can generate a report, fill in: ${gaps.join(", ")}. You can do it now or whenever you're ready.`}
        />
      )}

      <div className="setup-grid">
        <section className="card setup-section">
          <h3 className="section-title">Profile</h3>
          <p className="section-hint tertiary">Appears in the invoice header sent to Macquarie.</p>
          <Field label="Full name"><input className={invalid(!profile.submitter.name)} value={profile.submitter.name} onChange={(e) => patchSub("submitter", { name: e.target.value })} /></Field>
          <Row>
            <Field label="Email"><input className="input" value={profile.submitter.email} onChange={(e) => patchSub("submitter", { email: e.target.value })} /></Field>
            <Field label="Job title (optional)"><input className="input" value={profile.submitter.jobTitle} onChange={(e) => patchSub("submitter", { jobTitle: e.target.value })} /></Field>
          </Row>
          <Field label="Phone"><input className="input" value={profile.submitter.phone} onChange={(e) => patchSub("submitter", { phone: e.target.value })} /></Field>
          <Field label="Address line 1"><input className={invalid(!profile.submitter.addressLine1)} value={profile.submitter.addressLine1} onChange={(e) => patchSub("submitter", { addressLine1: e.target.value })} /></Field>
          <Row>
            <Field label="Address line 2 / city"><input className="input" value={profile.submitter.addressLine2} onChange={(e) => patchSub("submitter", { addressLine2: e.target.value })} /></Field>
            <Field label="Country"><input className="input" value={profile.submitter.country} onChange={(e) => patchSub("submitter", { country: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Invoice prefix"><input className="input mono" placeholder="HBEXPENSE" value={profile.invoicePrefix} onChange={(e) => patch({ invoicePrefix: e.target.value })} /></Field>
            <Field label="Vendor ID"><input className="input mono" value={profile.vendorId} onChange={(e) => patch({ vendorId: e.target.value })} /></Field>
          </Row>
        </section>

        <section className="card setup-section">
          <h3 className="section-title">Invoice To</h3>
          <p className="section-hint tertiary">Who the invoice is addressed to.</p>
          <Field label="Recipient"><input className={invalid(!profile.invoiceTo.name)} value={profile.invoiceTo.name} onChange={(e) => patchSub("invoiceTo", { name: e.target.value })} /></Field>
          <Field label="Address"><textarea className="input" rows={3} value={profile.invoiceTo.address} onChange={(e) => patchSub("invoiceTo", { address: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={profile.invoiceTo.email} onChange={(e) => patchSub("invoiceTo", { email: e.target.value })} /></Field>
        </section>

        <section className="card setup-section">
          <h3 className="section-title">Bank details</h3>
          <p className="section-hint tertiary">Where Macquarie sends the reimbursement.</p>
          <Field label="Bank name"><input className="input" value={profile.bank.bankName} onChange={(e) => patchSub("bank", { bankName: e.target.value })} /></Field>
          <Field label="Account holder"><input className={invalid(!profile.bank.accountName)} value={profile.bank.accountName} onChange={(e) => patchSub("bank", { accountName: e.target.value })} /></Field>
          <Row>
            <Field label="Account number"><input className={`mono ${invalid(!profile.bank.accountNumber)}`} value={profile.bank.accountNumber} onChange={(e) => patchSub("bank", { accountNumber: e.target.value })} /></Field>
            <Field label="SWIFT / BIC"><input className="input mono" value={profile.bank.swift} onChange={(e) => patchSub("bank", { swift: e.target.value })} /></Field>
          </Row>
        </section>

        <section className="card setup-section">
          <h3 className="section-title">Base currency</h3>
          <p className="section-hint tertiary">Your reimbursement currency — every receipt converts to it.</p>
          <Field label="Home country">
            <select className="input" value={profile.homeCountry || "Vietnam"} onChange={(e) => chooseCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map((o) => <option key={o.country} value={o.country}>{o.country}</option>)}
            </select>
          </Field>
          <Field label="Reimbursement currency">
            <select className="input num" value={profile.baseCurrency} onChange={(e) => patch({ baseCurrency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{currencyLabel(c)}</option>)}
            </select>
          </Field>
          <p className="sec-note">Changing this affects only receipts you capture from now on — already-logged expenses keep the currency they were saved with.</p>
        </section>

        <section className="card setup-section">
          <h3 className="section-title">Currency markup</h3>
          <p className="section-hint tertiary">Applied to every conversion. Default 3% covers the bank spread.</p>
          <div className="markup-row">
            <input className="input mono markup-input" type="number" min={0} step={0.5} value={profile.currencyMarkupPct} onChange={(e) => patch({ currencyMarkupPct: Number(e.target.value) })} />
            <span className="markup-pct">%</span>
          </div>
          <p className="markup-example tertiary">Example: 1 THB = 736.82 → with markup = <span className="num">{(736.82 * (1 + profile.currencyMarkupPct / 100)).toFixed(2)}</span></p>
        </section>

        <section className="card setup-section setup-codes">
          <div className="codes-head">
            <h3 className="section-title">Country codes</h3>
            <button className="btn btn-ghost" onClick={addCode}>+ Add country</button>
          </div>
          <p className="section-hint tertiary">Each receipt is tagged with one of these; the account code is what appears on the expense line.</p>
          <div className="codes-list">
            {codes.map((c) => (
              <div className="code-row" key={c.id}>
                <input className="input" placeholder="Country (e.g. Vietnam)" value={c.country} onChange={(e) => patchCode(c.id, { country: e.target.value })} />
                <input className="input mono" placeholder="Vietnam: 8741-4105" value={c.accountCode} onChange={(e) => patchCode(c.id, { accountCode: e.target.value })} />
                <button className="btn btn-ghost code-del" onClick={() => removeCode(c.id)} aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="setup-foot">
        {gaps.length > 0 && !showErrors && <button className="btn btn-ghost" onClick={() => setShowErrors(true)}>Check required fields</button>}
        <button className="btn btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
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
function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>;
}
