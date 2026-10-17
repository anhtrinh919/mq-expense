# Single-User Expense Flow Validation

Test contract for `/sdd-review`. Every check must pass before the phase is approved.

> **Primary-flow stop criteria:** the checks tagged **[PRIMARY]** (covering stories S2, S3, S4, S9) block release if they fail. Other failures are bugs that block but do not stop the review.

## Automated Checks

Run these commands. Each must exit 0.

- **TypeScript (app):** `cd app && tsc --noEmit` — zero errors
- **TypeScript (server):** `cd server && tsc --noEmit` — zero errors
- **Unit — data layer:** `cd app && vitest run src/data` — CRUD for all five stores, image Blob round-trip, first-run seed inserts 5 country codes
- **Unit — invoice numbering:** `cd app && vitest run invoice-number` — `{prefix}{YY}-{n}` increments within a year and resets across years
- **Unit — capture state machine:** `cd app && vitest run capture` — queue advances; low-confidence path leaves fields blank; conversion = round(amount × rate × (1+markup/100))
- **Unit — backup round-trip:** `cd app && vitest run backup` — export→import on a fresh DB restores identical data incl. byte-equal image Blobs; corrupt file rejected
- **API — health:** `curl -sf http://localhost:PORT/api/health` — returns `{status:"ok", reader: ...}`
- **API — process-receipt (success):** `bash server/verify/verify-process-receipt.sh` — sample image → 200 with `reading` + base64 `bwScan`
- **API — process-receipt (bad type):** unsupported file → 400
- **API — process-receipt (no persistence):** after the call, no temp file remains under the server working dir
- **API — fx (success):** `curl -sf "http://localhost:PORT/api/fx?from=THB&to=VND"` — numeric `rate`, `source:"xe.com"`
- **API — fx (invalid currency):** `?from=ZZZ&to=VND` → 400
- **API — generate-report (success):** `bash server/verify/verify-generate-report.sh` — fixture → 200; combined PDF section order invoice→detail→receipts; xlsx has per-account subtotals + grand total
- **API — generate-report (no expenses):** empty expenses → 422
- **API — generate-report (missing profile field):** → 400

## Manual Verification

Walk through these in a browser. Each is pass/fail.

**Viewport 390px (mobile):**
- [ ] Capture — "Take photo" opens the device camera; a captured photo enters the review queue **[PRIMARY]**
- [ ] Capture — adding a receipt and saving completes with no horizontal scroll **[PRIMARY]**
- [ ] App shell — all five areas reachable; primary "Add receipt" reachable in one tap
- [ ] Expenses — list and edit usable on mobile width

**Viewport 1280px (desktop):**
- [ ] Capture — drag-and-drop several files at once; they queue and are reviewed one at a time ("Receipt N of M") **[PRIMARY]**
- [ ] Capture — attach a PDF receipt; it is read and a B&W scan is produced **[PRIMARY]**
- [ ] Setup — all five sections save and reload correctly; add/edit/delete a country code
- [ ] Navigation between Setup, Capture, Expenses, Reports, Backup works

**User flows:**
- [ ] **[PRIMARY] S2/S3/S4 — Capture happy path:** add an image receipt in a foreign currency → AI reads date+amount → currency converts to VND at rate×(1+markup) (verify the Notes string format) → pick country + description → Save → expense appears in the log with correct VND, original amount/currency, rate, and account code
- [ ] **[PRIMARY] S9 — Report generation:** with ≥1 unsubmitted expense, pick a date range → review list + total → Generate → both files download; the combined PDF is invoice → expense detail → merged receipt scans; the invoice number is the correct auto-incremented `{prefix}{YY}-{n}`; the Excel matches the existing layout
- [ ] S3 low-confidence path: feed a hard-to-read receipt → review form shows the unread field(s) blank/flagged → type the value from the visible receipt → Save succeeds
- [ ] S5/S8: open a saved expense → both the original colour photo and the B&W scan are viewable
- [ ] S7: edit a logged expense's amount/currency → VND re-converts; edit description/country/code → persists; delete an expense → it and its images are removed
- [ ] S6: filter the log by date range, by country, by submitted/unsubmitted; search a description → correct subset shown
- [ ] S10: after generating a report, its expenses show "Submitted" and do not appear in the next report's range list
- [ ] S11: History lists the report (period, invoice number, total); re-download returns the same files
- [ ] S12: Mark a report Paid → it is archived and locked; delete a not-yet-paid report → its expenses return to unsubmitted and can be re-reported
- [ ] S13 backup: Export → a single file downloads; on a fresh browser profile, Import → all settings, expenses, images, and reports restored (verify an image opens)
- [ ] Empty states: Expenses with no data shows a prompt to Capture; Reports History with none shows a prompt to Create
- [ ] Error states: unsupported file in Capture shows a named error (not a blank screen); report generation failure marks nothing Submitted and downloads nothing
- [ ] Generate is disabled with a visible reason when the profile is incomplete or zero expenses are checked
- [ ] Home/landing (desktop + mobile): the at-a-glance counts (unsubmitted count+sum, this-trip, pending-payment) reflect the actual local data and update after capturing/generating; "Add receipts" reaches Capture
- [ ] Reports/Create per-expense include: unchecking an in-range expense excludes it from the total and from the generated package (only checked items are marked Submitted)
- [ ] Reports/Create invoice number: the field is pre-filled with the correct suggested `{prefix}{YY}-{n}` and is editable; the generated invoice uses the shown value
- [ ] Setup carries all invoice fields: submitter name, address (2 lines) + country, phone, and vendor ID are present and flow into the generated invoice header (matches the existing template)

**Privacy verification:**
- [ ] After capturing and after generating a report, inspect the server working directory / logs — no receipt image, no expense data, and no report file is written to or retained on the server
- [ ] Receipt reading uses `claude -p` on homepc-1 (or the Tesseract fallback if unavailable, surfaced via `/api/health`)

## Definition of Done

This phase is complete when ALL of the following are true:

- [ ] All automated checks pass (exit 0)
- [ ] All manual verifications pass — all **[PRIMARY]** checks pass without exception
- [ ] Frontend compliance check passes (handover covers all UI requirements)
- [ ] UX review passes — no blocking issues on the primary flow
- [ ] Output format verified against the existing cowork pipeline (combined-PDF order, Excel layout, invoice format, Notes conversion string)
- [ ] The privacy verification passes — the server persists nothing
- [ ] User explicitly approves
- [ ] Living docs updated: README status, WIKI learnings, docs/api.md, CHANGELOG.md
