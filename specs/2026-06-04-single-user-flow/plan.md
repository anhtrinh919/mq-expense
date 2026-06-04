# Single-User Expense Flow Implementation Plan

Each group is independently reviewable. Code-harness implements and verifies one group before the next. No visual specifics here — those come from the design file produced by `/frontend`.

## Group 1: Project scaffold + app shell
**Delivers:** A running web app on homepc-1 — Vite + React + TypeScript (strict) front end, Express + TypeScript server that serves the built SPA and exposes `/api/*`, with a forward-compatible navigation shell across Setup · Capture · Expenses · Reports · Backup (no Phase-2 nodes).
**Depends on:** none — scaffold
**Verify:** `tsc --noEmit` passes for both `app/` and `server/`; `GET /api/health` returns `{status:"ok",...}`; the SPA loads and nav routes render placeholder pages.

1. Scaffold `app/` (Vite React TS, strict tsconfig) and `server/` (Express TS), with exact-pinned dependencies (no `^`/`~`).
2. Server serves the built SPA + mounts an `/api` router; add `GET /api/health` reporting reader availability (`claude -p` detected vs Tesseract vs unavailable).
3. Build the nav/layout shell and route stubs for the five Phase-1 areas; make Capture the primary action. Nav structured so account nodes can be added later without restructuring.
4. Add a single run command for homepc-1 (`server` serves static build + API on one port).

## Group 2: Local data layer (IndexedDB / Dexie)
**Delivers:** The complete client-side data model and a typed data-access layer — profile, countryCode, expense, image (Blobs), report — with schema versioning and the country-code first-run seed.
**Depends on:** Group 1
**Verify:** Vitest unit tests for the data layer (create/read/update/delete each store; image Blob round-trip; first-run seed inserts the 5 default country codes) pass.

1. Define Dexie schema + TypeScript types for all five stores per the data model.
2. Implement repositories: profile (singleton get/save), countryCodes (CRUD + ordered list + first-run seed of VN/TH/KH/MM/AU), expenses (CRUD + filter by date range/country/status + description search), images (store/get Blobs by expense), reports (CRUD).
3. Implement the client-side invoice-number computation (`{prefix}{YY}-{n}`, year from a given date, n from existing reports of that year).

## Group 3: Setup screen
**Delivers:** S1 — the one-page Setup with Profile, Invoice To, Bank, Country Codes (add/edit/delete), and Currency Markup, persisted to IndexedDB; first-run seeded country codes; validation that flags an incomplete profile (used later to gate report generation).
**Depends on:** Group 2
**Verify:** Vitest component tests: fields persist and reload from the data layer; adding/editing/deleting a country code updates the store; markup validation rejects negatives/non-numbers.

1. Build the Setup page with the five sections (single page, no inner nav).
2. Wire each section to the profile/countryCode repositories with a save indicator.
3. Country Codes editor: add/edit/delete rows (country + account-code label).
4. Profile-completeness check helper (required fields for a valid invoice) exposed for the Reports gate.

## Group 4: Server — receipt reading + B&W scan (`/api/process-receipt`)
**Delivers:** The stateless endpoint that reads a receipt via `claude -p` (Tesseract fallback) and returns `{reading, bwScan}`, holding the file in memory only.
**Depends on:** Group 1
**Verify:** `verify-process-receipt.sh` — POST a sample image returns 200 with a `reading` object and a base64 `bwScan`; POST an unsupported type returns 400; with the reader stubbed unavailable returns 503; confirm no temp file remains on server disk after the call.

1. Multipart upload handling in memory (no disk writes); enforce accepted formats + size limit (400/413).
2. Port `scan_receipt.py` (Pillow: grayscale, auto-crop, deskew, contrast) to produce the B&W scan as a Python subprocess; for PDF input, produce a B&W version for the package.
3. Receipt-reading adapter: invoke `claude -p` with the image and a structured-extraction prompt → `{date, amount, currency, confidence}`; Tesseract fallback path; map failures to 422/503.
4. Guarantee in-memory-only handling and post-response cleanup; unit/integration check that nothing persists.

## Group 5: Server — FX rate (`/api/fx`)
**Delivers:** Raw xe.com rate fetch with a 1-hour in-memory cache.
**Depends on:** Group 1
**Verify:** `verify-fx.sh` — `GET /api/fx?from=THB&to=VND` returns a numeric `rate` with `source:"xe.com"`; an invalid currency returns 400; a second call within an hour is served from cache (observable via timing/log).

1. Port the xe.com rate fetch+parse from the existing pipeline; return the raw rate (client applies markup).
2. In-memory TTL cache (1h) keyed by currency pair; invalid-currency → 400; source-unreachable → 502.

## Group 6: Capture flow
**Delivers:** S2–S5 — multi-file add (mobile camera + gallery; desktop browse + drag-drop; PDF + common images), a one-at-a-time review queue, AI reading + currency conversion to VND, manual fallback for unread fields, and saving each expense with both the colour original and the B&W scan to IndexedDB.
**Depends on:** Groups 2, 3, 4, 5
**Verify:** Vitest tests for the capture state machine (queue advance, low-confidence → blank-field path, conversion math = rate×(1+markup) rounded); manual smoke per validation.md.

1. File intake: multi-select + drag-drop (desktop) and camera/gallery input (mobile); format/size guard with inline errors; build the receipt queue.
2. Per-receipt processing: call `/api/process-receipt`, show reading + the produced B&W scan; on low-confidence/missing fields show blank flagged fields.
3. Currency: when originalCurrency ≠ VND, call `/api/fx`, apply markup, compute whole-VND amount; build the Notes conversion string in the exact existing format.
4. Review form: country picker (from configured codes → account-code label), description, editable date/amount/notes; Save persists the expense + both images; queue advances; confirmation per receipt.

## Group 7: Expenses (Manage) screen
**Delivers:** S6–S8 — the expense log list with filters (date range, country, status) + description search, per-row view (both images), edit (re-converting if amount/currency changed), and delete.
**Depends on:** Groups 2, 6
**Verify:** Vitest: filtering/search return correct subsets; edit persists and re-converts on amount/currency change; delete removes the expense and its images.

1. Expense list with the row fields from the data model + receipt thumbnail.
2. Filter + search controls wired to the repository queries.
3. Edit form (all fields incl. country/account code, notes); re-conversion when amount/currency changes.
4. View-receipt viewer (colour + B&W); delete with confirmation.

## Group 8: Server — report assembly (`/api/generate-report`)
**Delivers:** S9 (server half) — stateless assembly of the invoice xlsx + expense-detail xlsx → PDFs + merged receipt scans → combined PDF (invoice → expense detail → receipts) + the expense Excel, returned to the client.
**Depends on:** Group 1
**Verify:** `verify-generate-report.sh` — POST a fixture (profile + 2 expenses + 2 B&W scans) returns 200 with a combinedPdf whose section order is invoice→detail→receipts and an expenseXlsx with correct subtotals/grand total; zero expenses → 422; missing profile field → 400; no server temp files remain.

1. Port `generate_report.py` assembly onto the request payload (no folders): build expense-detail xlsx (sorted by date, per-account-code subtotals, grand total) and invoice xlsx (from the bundled template, filling invoice number/date/description/total/submitter/bank).
2. xlsx→PDF conversion engine on homepc-1 (LibreOffice headless, matching the existing pipeline); merge receipt scans; combine in order; return both files base64.
3. Validate inputs (400/422); in-memory-only handling + post-response cleanup.

## Group 9: Reports — Create + History/Archive
**Delivers:** S9–S12 — pick a date range, review unsubmitted expenses in range, generate (calls Group 8, downloads both files, marks Submitted, assigns invoice number), and a History list with re-download, Mark Paid (archive/lock), and Delete-if-not-paid (un-submit → returns expenses to the pool).
**Depends on:** Groups 7, 8
**Verify:** Vitest + manual: generating assigns the correct next invoice number and marks expenses Submitted; a generated-not-paid report can be deleted and its expenses return to unsubmitted; a Paid report is locked.

1. Reports — Create: date-range pickers, in-range unsubmitted list with running total, generate-button gating (profile complete + ≥1 expense), call Group 8, trigger both downloads, mark expenses Submitted with the invoice number, persist the report (caching the generated files for re-download).
2. Reports — History: list reports; re-download cached files; Mark Paid (confirm → status paid, locked); Delete-if-not-paid → un-submit included expenses (status back to pending, clear invoiceNumber/reportId) and remove the report.

## Group 10: Backup (export / import)
**Delivers:** S13 — export all data (profile + country codes + expenses + both image sets + reports) to a single file; import to fully restore on another device, with a replace-warning.
**Depends on:** Groups 2, 9
**Verify:** Vitest: a round-trip export→import on a fresh DB restores identical profile, expense count, image Blobs (byte-equal), and report history; a corrupt/invalid file is rejected with no data change.

1. Export: serialize all stores including image Blobs (base64-embedded JSON or zip) to one downloadable file.
2. Import: parse, validate, warn that import replaces current data, then restore all stores including images; report restored counts; reject invalid files.

## Group 11: Story walk + edge cases
**Delivers:** End-to-end verification of every user story; error/empty/loading states; mobile adaptation; the privacy guarantees (no server persistence).
**Depends on:** Groups 1–10
**Verify:** Every manual check in validation.md passes at 390px and 1280px; the primary-flow stories (S2, S3, S4, S9) pass end-to-end; a network-tab/log review confirms the server writes nothing to disk.

1. Walk each story; fix gaps.
2. Empty/loading/error states for every screen; degraded-reader warning from `/api/health`.
3. Mobile pass (camera capture, one-tap add, no horizontal scroll).
4. Privacy check: confirm uploads/report payloads are not persisted server-side.
