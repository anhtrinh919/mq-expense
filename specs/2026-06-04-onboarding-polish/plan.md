# Implementation Plan — Onboarding, Polish & Quality (Phase 2)

Numbered task groups, each independently reviewable. Visual treatment comes from the existing design system (`src/styles/design-tokens.css`) at build time — no hex/spacing/font specifics here. Builds on the Phase 1 codebase (`src/`, `server/`).

## Group 1 — Data model migration + base currency core

Bump the Dexie schema and thread base currency through the data layer.

- In `src/data/types.ts`: replace `Profile.homeCurrency: "VND"` with `baseCurrency: string`; add `homeCountry: string`, `pinHash: string | null`, `onboardingComplete: boolean`. Add `Expense.baseCurrency: string`.
- In `src/data/db.ts`: add a new Dexie version with an `upgrade` that backfills existing records (`baseCurrency:"VND"`, `homeCountry:"Vietnam"`, `pinHash:null`, `onboardingComplete:true`, each expense `baseCurrency:"VND"`).
- In `src/data/repos.ts`: expose helpers to read/update the new profile fields; `expense` writes record `baseCurrency` from the current profile at capture time.
- Add a country→currency map utility (VN→VND, TH→THB, KH→KHR, MM→MMK, AU→AUD, + a small set of common others) in `src/lib/`.
- **Verify:** `npm run test -- src/data` — migration backfills defaults on a Phase-1-shaped DB; new expenses persist `baseCurrency`. `npm run typecheck` clean.
- **Depends on:** none.

## Group 2 — Currency + FX + report base-currency plumbing

Make conversion and report generation honor `baseCurrency` instead of hard-coded VND.

- `src/lib/currency.ts` + `src/lib/api.ts`: FX requests send `to=<baseCurrency>`; conversion target is the base currency (math unchanged: `round(amount × rate × (1+markup/100))`).
- `server/routes/fx.ts`: validate both `from` and `to`; keep 1-hour in-memory cache keyed by pair.
- `server/routes/generateReport.ts` + `server/python/generate_report.py`: accept `baseCurrency` (default `"VND"`); use it for the amount column header (`Amount (<BASE>)`) and the per-row conversion-string currency. Section order, template, subtotals, grand total, Notes math unchanged.
- **Verify:** `bash server/verify/verify-fx.sh` with a non-VND `to` returns a numeric rate; `bash server/verify/verify-generate-report.sh` with `baseCurrency:"VND"` still matches the Phase 1 golden output (byte-equivalent layout), and a `baseCurrency:"THB"` fixture produces `Amount (THB)`.
- **Depends on:** Group 1.

## Group 3 — PIN gate

Soft-lock the app behind an optional PIN.

- `src/lib/pin.ts`: hash/verify a numeric PIN (hash only; never store plaintext). Set/clear/reset helpers operate on `Profile.pinHash`.
- New `src/screens/PinLock.tsx` (+ css): lock screen shown on app open when `pinHash` is set; numeric entry, wrong-PIN feedback, "Forgot PIN?" → reset (confirms no data loss, clears or re-sets the PIN).
- `src/App.tsx`: gate the app behind `PinLock` when a PIN is set and the session is locked; unlock for the session after a correct entry.
- **Verify:** `npm run test -- pin` — set→verify→reset round-trip; wrong PIN rejected; reset clears `pinHash` without touching other data. Manual: app open with a PIN shows the lock; correct PIN unlocks; reset works.
- **Depends on:** Group 1.

## Group 4 — Onboarding flow

First-run guided setup; replaces dropping the user onto the config page.

- New `src/screens/Onboarding.tsx` (+ css) as a stepped flow: Welcome → Your details (name, home country → currency override) → optional Set-a-PIN (skippable) → Done (3-point quick guide) → land on Home/Capture. Include a "Restore from a backup instead" entry on Welcome that reuses the existing import path.
- Onboarding writes `submitter.name`, `homeCountry`, `baseCurrency`, optional `pinHash`, and `onboardingComplete:true`.
- `src/App.tsx`: when `onboardingComplete` is false, route to Onboarding before anything else.
- **Verify:** `npm run typecheck` clean; manual: a fresh DB launches Onboarding; completing it lands on Capture-ready with currency set; the Restore branch imports a `.mqx` and skips the rest.
- **Depends on:** Groups 1, 3.

## Group 5 — Settings (absorb Setup) + relocated restore

Make Settings the single config home.

- Rename/repurpose `src/screens/Setup.tsx` → `src/screens/Settings.tsx` (+ css), keeping all Phase 1 sections (Profile, Invoice To, Bank, Country Codes, Currency Markup). Add: Base Currency (home country + reimbursement currency, editable), Security (Set / Change / Remove PIN), and Restore (import a `.mqx` with the replace-warning).
- Update nav label/route in `src/components/AppShell.tsx` (and mobile nav) from "Setup" to "Settings"; keep the keyboard shortcut.
- Base-currency change applies forward-only (does not touch existing expenses) — show a one-line note to that effect.
- **Verify:** `npm run typecheck` clean; manual: every section saves and reloads; change base currency persists and only affects new captures; Change/Remove PIN works; Restore imports a backup.
- **Depends on:** Groups 1, 3.

## Group 6 — Backup page export-only

- `src/screens/Backup.tsx`: remove the Import/restore card (now in Onboarding + Settings); keep Export-all; add a pointer to Settings → Restore.
- **Verify:** manual: Backup shows export only; restore is reachable from Settings and Onboarding. `npm run typecheck` clean.
- **Depends on:** Groups 4, 5.

## Group 7 — Capture v2 (background pre-read + review-all + autosave)

Rework the capture queue into one smooth pass.

- `src/screens/Capture.tsx`: on file add, start `process-receipt` for **all** items in the background (bounded concurrency), tracking per-item status (reading / read / needs-attention / failed); the inspector edits the current item while others finish.
- Add a **review-all** summary view (compact, editable list of every receipt's read values + country/description) with one "Save all" that commits the batch and per-row remove.
- Autosave the in-progress queue + edits to `localStorage` (namespaced); restore on mount; clear on successful commit. A quiet "restored in-progress receipts" indication when a draft is recovered.
- **Verify:** `npm run test -- capture` — batch read tracking, review-all commit saves all rows, draft persists/restores/clears. Manual: add several files → all read in background → review-all → Save all; reload mid-review restores the queue.
- **Depends on:** Groups 1, 2.

## Group 8 — Settings draft autosave

- Apply the same `localStorage` draft pattern to the Settings form so an accidental reload/navigation mid-edit doesn't lose unsaved field changes; clear on save.
- **Verify:** manual: edit Settings fields, reload before saving → fields restored; after Save → draft cleared.
- **Depends on:** Group 5, Group 7 (shares the draft utility).

## Group 9 — Expenses sortable columns + default Unsubmitted filter

- `src/screens/Expenses.tsx`: make Date, Amount, Country, Status column headers clickable to sort (toggle asc/desc, show indicator); default sort Date descending.
- Change the default filter from "all" to Unsubmitted (`status: "pending"`); the existing filter control still switches to All/Submitted.
- **Verify:** `npm run typecheck` clean; manual: clicking each header sorts and re-sorts; table opens showing only unsubmitted; switching the filter still works.
- **Depends on:** Group 1.

## Group 10 — Sharper scans (OpenCV deskew with fallback)

- `server/python/scan_receipt.py`: before the existing grayscale/contrast steps, attempt an OpenCV four-point perspective transform + deskew (find the largest confident document quadrilateral, warp to a flat rectangle). On low confidence / no quad found, fall back to the Phase 1 axis-aligned crop. Pin `opencv-python-headless` exactly in the Python requirements.
- **Verify:** `bash server/verify/verify-process-receipt.sh` still returns 200 with a `bwScan`; an angled-receipt fixture produces a visibly straighter scan; a plain receipt is unchanged or better (no regression). Server typecheck unaffected.
- **Depends on:** none (server-only; independent of the data model).

## Group 11 — One-zip report download

- `src/lib/` + `src/screens/Reports.tsx`: after `generate-report` returns the two files, bundle them client-side into a single `.zip` named from the invoice number and trigger one download. Pin the zip library exactly. Update the success copy to "one zip downloaded".
- **Verify:** manual: generating a report downloads exactly one `.zip` (no browser multi-file prompt) containing the combined PDF + the Excel, both intact and openable.
- **Depends on:** Group 2.

## Group 12 — Story walk + integration

- Walk every user story (S1–S10) end-to-end at mobile (390px) and desktop (1280px). Confirm the Phase 1 flows (capture happy path, report generation, backup round-trip including an **old** Phase 1 `.mqx`) still pass unchanged for a VND user.
- Confirm privacy unchanged: nothing persisted server-side after capture/report.
- **Verify:** full `npm run test` green; `npm run typecheck` clean; the validation.md manual checklist passes; all `[PRIMARY]` checks pass.
- **Depends on:** Groups 1–11.
