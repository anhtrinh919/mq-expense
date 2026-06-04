# Onboarding, Polish & Quality Requirements

---
phase: 2
type: feature
ui: true
---

## Phase type

`feature` — adds capability to the existing, shipped single-user app (Phase 1). All existing patterns, the design system (`design-tokens.css`, Inter / Instrument Serif / JetBrains Mono), the sidebar/bottom-nav shell, and the stateless-server / local-only-data contract are **preserved**. Nothing from Phase 1 is redesigned; Phase 2 sands the rough edges found in the first dogfood and makes the app welcoming to a brand-new user.

## Scope

Make MQ Expense friendly for a first-time user and smoother for the daily user, while staying single-user and local-only (the server still persists nothing). On completion a user can: go through a short guided first run (their name, home country → reimbursement currency, and an optional peace-of-mind PIN) and land ready to capture, without facing a dense config page; unlock the app with that PIN on each open (and reset it freely if forgotten — no data is ever locked away); manage everything from a single **Settings** area that absorbs today's Setup plus Change-PIN, base currency, and restore-from-backup; capture several receipts at once where all of them are read in the background while the user reviews, with a final review-all step before saving and with in-progress work auto-saved across an accidental reload; get noticeably cleaner scans of receipts photographed at an angle; sort the expenses table and have it open already filtered to "Unsubmitted"; and download a finished report as a single zip file instead of triggering the browser's "download multiple files" prompt.

The reimbursement (base) currency becomes per-user instead of hard-coded VND: a Vietnam rep is reimbursed in VND, a Thailand rep in THB, set once from their home country and changeable later. This is foundational for the Phase 3 multi-user rollout but is built and exercised single-user here.

## User Stories

> **PRIMARY FLOW (stop criteria for `/sdd-review` — these block release if they fail):** S1, S5.

- **S1.** As a brand-new user, I am taken through a short guided first run — my name, my home country (which sets my reimbursement currency), and an optional PIN — and then land ready to capture, instead of being dropped onto a dense config page. `[Onboarding (Ph2), Steps 1–4]`
- **S2.** As a user who set a PIN, I see a lock screen each time I open the app and unlock it by entering my PIN; if I forget it I can reset it from the lock screen, and resetting never loses any of my data (it is reassurance, not encryption). `[Onboarding (Ph2), Step 5 / app open]`
- **S3.** As a user, my reimbursement currency is set once from my home country (VN→VND, TH→THB, etc.), every receipt converts to it, and I can change it later in Settings; changing it affects only receipts I capture afterwards — already-logged expenses keep the amount and currency they were saved with. `[Onboarding (Ph2), Step 2 / Settings (Ph2)]`
- **S4.** As a user, I manage all my configuration from one Settings area — the former Setup sections (Profile, Invoice To, Bank, Country Codes, Currency Markup), plus my base currency, Change/Remove PIN, and Restore-from-backup — so there is one obvious place for everything. `[Settings (Ph2)]`
- **S5.** As a user, when I add several receipts they are all read in the background while I review, I can step through a review-all summary and correct any of them, and a single confirm saves the whole batch — so capturing many receipts is one smooth pass, not a stop-start wait per receipt. `[Capture (Ph2), Steps 1–4]`
- **S6.** As a user, if I accidentally reload the page or navigate away mid-edit (during Settings or mid-capture-review), my in-progress entries are still there when I come back, so a mis-click doesn't lose work. `[Capture (Ph2) / Settings (Ph2)]`
- **S7.** As a user, receipts I photographed at an angle come out noticeably straighter and cleaner in the black-and-white scan, so the submission package looks tidy (with a graceful fallback to today's crop when a receipt can't be cleanly straightened). `[Capture (Ph2)]`
- **S8.** As a user, I can sort my expenses table by clicking a column (date, amount, country, status), and the table opens already filtered to "Unsubmitted" so I see what still needs reporting first. `[Manage]`
- **S9.** As a user, when I generate a report I get a single downloaded zip containing the PDF and the Excel, so I no longer have to approve the browser's "download multiple files" prompt. `[Report, Step 6]`
- **S10.** As a user, the everyday Backup page now only exports (restore has moved into first-run and Settings), so the page I use monthly is just the safe "download my data" action. `[Archive & Backup, Steps 4–5]`
- **S11.** As a user, the live app matches the Pencil design on the things that drifted in Phase 1 — the Instrument Serif heading/display face is applied everywhere a heading should use it (not just the brand), and the mobile bottom nav + center capture FAB render as designed — so the app looks as intended across screens, with all new Phase 2 screens built true to the design file. `[Global / shell]`

## UI Requirements

Only **new or changed** screens/states are listed. Every Phase 1 screen not named here is unchanged. Behavior and key elements only — visual treatment follows the existing design system and `design-tokens.css`.

| Screen | State | Key UI Elements | Primary User Action |
|--------|-------|-----------------|---------------------|
| Onboarding | Welcome | First-run only; warm welcome, one-line promise, "data stays on this device" reassurance, Start button; a "Restore from a backup instead" link (for users moving devices) | Start, or choose Restore |
| Onboarding | Your details | Full name; home-country picker (seeded SEA list + others) that auto-selects a reimbursement currency, with the currency shown and overridable; concise, only the essentials | Enter name, pick country/currency, Continue |
| Onboarding | Set a PIN (optional) | Numeric PIN entry + confirm; clearly labelled optional with a "Skip for now" action; plain-language note that it's privacy reassurance, not encryption, and resettable | Set PIN or Skip |
| Onboarding | Done | "You're set" confirmation; a one-screen 3-point quick guide (capture → review → report; files saved locally); CTA into Capture | Go to Capture |
| Onboarding | Restore (entry from Welcome) | File picker for a `.mqx` backup; same import/progress/result behavior as Phase 1 Backup import; on success lands on Home | Pick backup file, restore |
| PIN lock | Default | Shown on app open when a PIN is set; numeric entry; wrong-PIN feedback; "Forgot PIN?" link | Enter PIN to unlock |
| PIN lock | Reset | Confirmation that resetting clears the PIN but keeps all data; sets a new PIN or removes it entirely | Reset / set new PIN |
| Settings | Default | Single page replacing Setup. Sections: Profile, Invoice To, Bank Details, Country Codes, Currency Markup (all as Phase 1), **plus** Base Currency (home country + reimbursement currency), Security (Change PIN / Remove PIN / Set PIN), and Restore (import a `.mqx` backup with the replace-warning). Save indicator; drafts auto-saved | Edit any section; change PIN; restore |
| Settings | First-run-deferred fields | When invoice/bank fields were skipped at onboarding, they show empty with helper hints; a gentle prompt that a report needs them | Fill when ready |
| Capture | Reviewing (batch pre-read) | On adding files, **all** receipts begin reading immediately in the background; the queue shows per-item read status (reading / read / needs attention / failed); the current item's inspector is editable while others finish; "N of M" plus an at-a-glance queue rail | Review/correct items as they become ready |
| Capture | Review-all summary | Before committing, a compact list of every receipt with its read date/amount/currency/converted value and country/description, each row editable or jump-to; one "Save all" commits the batch; per-row remove | Review the batch, Save all |
| Capture | Draft restored | On returning after a reload/navigation mid-review, a quiet "restored your in-progress receipts" indication; the queue and edits are intact | Continue where left off |
| Expenses | Default (sortable + default filter) | Same table as Phase 1, but column headers for Date, Amount, Country, and Status are clickable to sort (asc/desc, with an indicator); table **opens filtered to Unsubmitted** by default (filter control still lets the user switch to All/Submitted) | Sort by column; change filter |
| Reports — Create | Success (single zip) | Same as Phase 1 but a single `.zip` (named from the invoice number) downloads, containing the combined PDF + the Excel; the success copy says "one zip downloaded" | Download zip / go to History |
| Backup | Default (export-only) | Export-all action only; the Import/restore card is **removed** from this page (moved to Onboarding + Settings); reassurance copy + a pointer to Settings → Restore | Export data |

## Data Model

Client-side (IndexedDB via Dexie). The server persists nothing. Phase 2 changes are **additive/migrating** — a Dexie version bump migrates existing records with safe defaults.

**`profile` (changed):**
- `baseCurrency: string` — **replaces** the Phase 1 fixed `homeCurrency: "VND"`. The user's reimbursement currency. Migration: existing profiles get `"VND"`.
- `homeCountry: string` — new; the country chosen at onboarding that seeded `baseCurrency`. Migration: existing get `"Vietnam"`.
- `pinHash: string | null` — new; a hash (not the plaintext) of the PIN, or `null` when no PIN is set. Reassurance only — see Constraints. Migration: `null`.
- `onboardingComplete: boolean` — new; `false` triggers the first-run wizard. Migration: existing profiles (any saved data present) get `true` so returning users are not re-onboarded.
- (unchanged: `invoicePrefix`, `vendorId`, `submitter{...}`, `invoiceTo{...}`, `bank{...}`, `currencyMarkupPct`, `updatedAt`.)

**`expense` (changed):**
- `baseCurrency: string` — new; the reimbursement currency this row was converted to, recorded at capture time so a later base-currency change cannot mislabel old rows. Migration: existing expenses get `"VND"`.
- `amountVND` **keeps its field name** for storage/stack compatibility but is semantically "amount in `baseCurrency`". For VND users nothing changes; for others the displayed/reported label is driven by `baseCurrency`. (See latent decision — a rename across the whole stack was rejected as risky churn.)
- (all other fields unchanged.)

**No new stores.** In-progress drafts (Settings form, Capture review queue) are held in `localStorage` under namespaced keys and cleared on successful save/commit — transient, never part of a backup.

**Backup format:** the `.mqx` export now carries the new profile fields and `expense.baseCurrency`. Import of an older Phase 1 `.mqx` must succeed, applying the same migration defaults (`baseCurrency:"VND"`, `homeCountry:"Vietnam"`, `pinHash:null`, `onboardingComplete:true`).

## API Contracts

No new endpoints. Two existing contracts gain a parameter/field; one endpoint's internal behavior improves with no contract change.

### Get FX Rate (changed — `to` is now variable)
- **Method + path:** `GET /api/fx?from=<CUR>&to=<BASE>`
- **Auth required:** No
- **Change:** `to` is the user's `baseCurrency` (still defaults to `VND` and remains valid). Both `from` and `to` are validated.
- **Success response:** `{ rate, from, to, source:"xe.com", fetchedAt }` — 200 (raw rate; client applies markup). Unchanged shape.
- **Error responses:** `400` invalid `from` or `to` currency — `{ error: "invalid currency" }`; `502` source unavailable — `{ error: "rate source unavailable" }`; `500` unexpected.

### Generate Report Package (changed — carries base currency)
- **Method + path:** `POST /api/generate-report`
- **Auth required:** No
- **Change:** request JSON gains `baseCurrency: string` (defaults to `"VND"` if omitted, for backward compatibility). The Python uses it to label the amount column (`Amount (<BASE>)`) and the per-row conversion string currency. The combined-PDF section order, invoice template, subtotals/grand-total, and Notes-string math are otherwise **unchanged**.
- **Success response:** `{ combinedPdf:{filename,dataBase64}, expenseXlsx:{filename,dataBase64} }` — 200. (Zip bundling is done client-side; the API still returns the two files.)
- **Error responses:** `400` missing field / malformed — `{ error: "missing field: <name>" }`; `422` zero expenses — `{ error: "no expenses to report" }`; `500` assembly failed — `{ error: "report assembly failed", detail }`.

### Process Receipt (no contract change — better scan)
- **Method + path:** `POST /api/process-receipt` (multipart, `file`) — unchanged request/response.
- **Behavior change only:** the B&W scan step adds an OpenCV four-point perspective transform + deskew to straighten angled receipts, with a **graceful fallback** to the Phase 1 axis-aligned crop when no clean document rectangle is found. Output is still `{ reading, bwScan }`; no new fields, no new errors.

### Health (unchanged)
- `GET /api/health` → `{ status:"ok", reader:"claude"|"tesseract"|"unavailable" }`.

## Constraints & Context

- **Preserve Phase 1 everywhere it isn't explicitly changed:** the stateless server, local-only data, output format (combined-PDF order, Excel layout, invoice template, Notes conversion string, invoice numbering), the design system, and the sidebar/bottom-nav shell all stand. The base-currency change is the only output-format change, and it is label-only (the math and structure are identical); for VND users the output is byte-for-byte as before.
- **PIN is reassurance, not security:** data is already local-only and is **not** encrypted by the PIN. The PIN gate is a soft lock; a forgotten PIN is always resettable without data loss. Store only a hash of the PIN, never the plaintext. Do not market or imply encryption anywhere in copy.
- **Base currency is one-per-user and forward-only:** set at onboarding from home country, changeable in Settings; a change applies only to subsequently captured expenses. Each expense records the `baseCurrency` it was converted to. Country still sets the **account-code label** only, never the currency; the receipt's printed currency still wins for conversion (Phase 1 rule preserved).
- **Country → currency seeding:** the onboarding country picker pre-selects a sensible currency (VN→VND, TH→THB, KH→KHR, MM→MMK, AU→AUD) but the user can override the currency before continuing (covers reps reimbursed in a different currency than their country's default).
- **Drafts are transient and private:** auto-saved in-progress edits live in `localStorage`, are cleared on successful save/commit, and are never written to the server or included in a `.mqx` backup.
- **Scan straightening must never make a receipt worse:** if perspective/deskew can't find a confident document quadrilateral, fall back to the Phase 1 pipeline output. Add the OpenCV dependency pinned exactly (no `^`/`~`).
- **OS-agnostic** (Chrome/Safari/Firefox on macOS/Windows/iOS/Android); numeric PIN entry must be usable on a phone keypad; sortable headers and the zip download must work on mobile browsers.
- **Strict TypeScript; dependencies pinned exactly** (tech-stack non-negotiables). Any new client dependency (zip) and Python dependency (OpenCV) is pinned.
- **Design fidelity (global fixes scope, S11):** the design file `pencil/v0.1-p2.pen` is the source of truth. Reconcile the two systemic Phase 1 drifts app-wide — (a) the Instrument Serif display face must be applied to screen/section headings across all screens, not only the sidebar brand; (b) the mobile bottom nav + center capture FAB must be rebuilt to match the design's detailing (labels, proportions, the FAB). Build every new Phase 2 screen frame-by-frame from the design file. This is a targeted reconciliation of the flagged systemic issues, **not** a full screen-by-screen audit of every existing screen.

## Excluded from This Phase

- Any account, login, invite, or multi-user capability — that is Phase 3.
- Production deployment, remote server, or Cloudflare tunnel — that is Phase 4.
- Per-receipt base currency (base currency is one-per-user by decision).
- Encrypting local data — the PIN is a soft lock only; real at-rest encryption is out of scope.
- Re-converting or rewriting already-logged expenses when the base currency changes — the change is forward-only.
- Manual/no-receipt expense entry; in-app emailing; Macquarie Finance integration; a global country-code library — all remain out of scope as in Phase 1.
- Any change to the combined-PDF structure, the invoice template, subtotal/grand-total logic, or invoice numbering beyond the base-currency **label**.
