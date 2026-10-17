# Onboarding, Polish & Quality Validation (Phase 2)

Test contract for `/sdd-review`. Every check must pass before the phase is approved.

> **Primary-flow stop criteria:** the checks tagged **[PRIMARY]** (covering stories S1 onboarding-to-ready and S5 batch capture) block release if they fail. Other failures are bugs that block but do not stop the review.

## Automated Checks

Run these commands. Each must exit 0.

- **TypeScript:** `npm run typecheck` — app + server, zero errors.
- **Unit — data migration:** `npm run test -- src/data` — a Phase-1-shaped DB upgrades cleanly; profiles backfill `baseCurrency:"VND"`, `homeCountry:"Vietnam"`, `pinHash:null`, `onboardingComplete:true`; existing expenses backfill `baseCurrency:"VND"`; new expenses persist the current base currency.
- **Unit — PIN:** `npm run test -- pin` — set→verify→reset round-trip; correct PIN verifies, wrong PIN rejected; reset clears `pinHash` and leaves all other data untouched; plaintext PIN is never stored.
- **Unit — base currency / conversion:** `npm run test -- currency` — conversion = `round(amount × rate × (1+markup/100))` targets the base currency; FX request uses `to=<baseCurrency>`.
- **Unit — capture v2:** `npm run test -- capture` — batch pre-read tracks per-item status; review-all "Save all" commits every row; draft autosave persists, restores, and clears on commit.
- **Unit — invoice numbering (regression):** `npm run test -- invoice-number` — `{prefix}{YY}-{n}` increment + year reset unchanged.
- **Unit — backup round-trip (incl. old format):** `npm run test -- backup` — export→import restores identical data incl. byte-equal image Blobs and the new fields; importing an **old Phase 1** `.mqx` succeeds and applies migration defaults; corrupt file rejected.
- **API — health:** `curl -sf http://localhost:PORT/api/health` — `{status:"ok", reader:...}`.
- **API — fx (variable `to`):** `curl -sf "http://localhost:PORT/api/fx?from=THB&to=VND"` and `...&to=THB` both return a numeric `rate`, `source:"xe.com"`; `?to=ZZZ` → 400.
- **API — generate-report (VND regression):** `bash server/verify/verify-generate-report.sh` — `baseCurrency:"VND"` (or omitted) → 200; combined-PDF order invoice→detail→receipts; xlsx amount column header `Amount (VND)`; per-account subtotals + grand total intact.
- **API — generate-report (non-VND label):** a `baseCurrency:"THB"` fixture → 200; xlsx amount column header `Amount (THB)`; conversion string currency reflects THB; structure otherwise identical.
- **API — generate-report (errors):** zero expenses → 422; missing profile field → 400.
- **API — process-receipt (success + no regression):** `bash server/verify/verify-process-receipt.sh` — sample → 200 with `reading` + base64 `bwScan`; a plain receipt's scan is not worse than Phase 1.
- **API — process-receipt (no persistence):** after the call, no temp file remains under the server working dir.

## Manual Verification

Walk through these in a browser. Each is pass/fail.

**Viewport 390px (mobile):**
- [ ] **[PRIMARY]** Onboarding on a fresh browser: Welcome → name + country (currency auto-fills, overridable) → optional PIN (Skippable) → Done quick-guide → lands ready to capture; numeric PIN entry usable on a phone keypad; no horizontal scroll
- [ ] **[PRIMARY]** Capture batch: add several receipts → all read in the background → review-all summary → Save all; usable at mobile width
- [ ] Expenses: sortable headers and the Unsubmitted-default filter work on mobile; no horizontal scroll
- [ ] Settings: every section reachable and editable on mobile width

**Viewport 1280px (desktop):**
- [ ] PIN lock on app open (when set); correct PIN unlocks; "Forgot PIN?" reset confirms no data loss and clears/re-sets the PIN
- [ ] Settings absorbs all former Setup sections + Base Currency + Security + Restore; nav label is "Settings"
- [ ] Backup page shows Export only (no Import card); restore is reachable from Settings and Onboarding

**User flows:**
- [ ] **[PRIMARY] S1 — Onboarding to ready:** fresh DB → guided first run → base currency set from home country → land on Capture-ready; profile carries the name + currency
- [ ] **[PRIMARY] S5 — Batch capture:** add multiple receipts → background pre-read with per-item status → review-all → correct one row → Save all → all expenses appear in the log with correct converted amounts
- [ ] S2 — PIN: set a PIN, reload → lock screen → unlock; forget → reset → no data lost; remove PIN → no lock on next open
- [ ] S3 — Base currency: set THB in onboarding/Settings → a new capture converts to THB and the expense records `baseCurrency:THB`; an expense logged earlier as VND is unchanged; switching currency does not rewrite old rows
- [ ] S4 — Settings: change a Profile/Bank/Country-code field → saves and reloads; Change PIN; Restore a `.mqx`
- [ ] S6 — Draft autosave: mid-capture-review, reload → in-progress receipts restored; mid-Settings-edit, reload → unsaved fields restored; after Save → draft cleared
- [ ] S7 — Sharper scans: an angled-receipt photo produces a noticeably straighter B&W scan; a receipt that can't be cleanly straightened still produces the Phase 1 fallback scan (never a worse result)
- [ ] S8 — Sort + filter: clicking Date/Amount/Country/Status sorts and re-sorts with an indicator; the table opens filtered to Unsubmitted; switching to All/Submitted works
- [ ] S9 — One zip: generate a report → exactly one `.zip` downloads (no browser multi-file prompt) → it contains the combined PDF + the Excel, both open correctly; the PDF and Excel are unchanged from Phase 1 for a VND user
- [ ] S10 — Backup export-only: the everyday Backup page exports without offering import
- [ ] S11 — Design fidelity: screen/section headings render in Instrument Serif across screens (not Inter); at 390px the mobile bottom nav + center capture FAB match the design frame in labels, proportions, and FAB treatment; new Phase 2 screens visually match their `pencil/v0.1-p2.pen` frames

**Regression (Phase 1 must still hold for a VND user):**
- [ ] Capture happy path, report generation (correct invoice number, combined-PDF order, Excel layout), expense edit/delete, History mark-paid/delete, and a Phase 1 `.mqx` backup import all still pass
- [ ] Privacy: after capture and after report generation, nothing is written to or retained on the server

## Definition of Done

This phase is complete when ALL of the following are true:

- [ ] All automated checks pass (exit 0)
- [ ] All manual verifications pass — all **[PRIMARY]** checks pass without exception
- [ ] Frontend compliance check passes (handover covers all new/changed UI requirements)
- [ ] UX review passes — no blocking issues on the primary flow (onboarding + batch capture)
- [ ] Base-currency change is label-only for output; a VND user's PDF + Excel are byte-equivalent to Phase 1
- [ ] Privacy verification passes — the server still persists nothing; drafts live only in `localStorage` and never reach the server or a backup
- [ ] New dependencies (client zip, OpenCV) pinned exactly
- [ ] User explicitly approves
- [ ] Living docs updated: README status, WIKI learnings, docs/api.md, CHANGELOG.md
