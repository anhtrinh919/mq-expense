# Single-User Expense Flow Requirements

---
phase: 1
type: initial
ui: true
---

## Phase type

`initial` — first build of MQ Expense. No existing UI to honor. Greenfield. The original `cowork-skills/` Python pipeline is the source of truth for *output format, currency math, invoice numbering, and B&W scan processing* — but its CLI/folder interaction model is replaced by a web UI.

## Scope

Deliver the complete single-user expense workflow as a web app that runs on homepc-1 and is used by one person (no accounts/logins). On completion a user can: configure their invoice/bank/country profile once; add receipts (snap on mobile, drag-drop/attach on desktop — PDF or image, several at once) and have AI read the date + amount and convert any currency to VND; review/correct and save each receipt to a private log held only in their browser; edit or delete logged expenses; pick a date range and generate the exact Macquarie-accepted submission package (combined PDF: invoice → expense detail → merged receipt scans, plus an Excel sheet) with an auto-incremented invoice number; mark a report Paid to archive it; and export/import all their data as a backup file. The server stores nothing — it only reads receipts, fetches FX rates, and assembles the report files in memory, then discards everything.

## User Stories

> **PRIMARY FLOW (stop criteria for `/sdd-review` — these block release if they fail):** S2, S3, S4, S9.

- **S1.** As a user, I can fill in my Profile, Invoice-To, Bank, Country Codes, and Currency Markup on one Setup page so that my reports and conversions use my own details. `[Setup, Steps 2–5]`
- **S2.** As a user, I can add one or more receipt files (take a photo in-app on mobile; attach or drag-and-drop one or several files on desktop; PDF or any common image format) so that I can capture expenses the way that suits my device. `[Capture, Step 2]`
- **S3.** As a user, when I add receipts they queue up and I review them one at a time — for each the AI reads the date and amount, and I see a pre-filled form — so that I can confirm or correct each receipt before it is saved. `[Capture, Steps 4–6]`
- **S4.** As a user, for each receipt I pick a country and enter a description, and the app converts the receipt's amount to VND at the recorded exchange rate, so that the saved expense is in my reporting currency with the right account code. `[Capture, Steps 3,5–7]`
- **S5.** As a user, both the original colour photo and the cleaned black-and-white scan are saved with each expense so that I keep the untouched source and the version used in the submission package. `[Capture, Step 6]`
- **S6.** As a user, I can view my full expense log and filter it by date range, by country, and by submitted/unsubmitted status, and search descriptions, so that I can find specific expenses. `[Report, Step 2 / Manage]`
- **S7.** As a user, I can edit any field of a logged expense (date, amount, description, country/account code, notes) and delete an expense, so that I can correct mistakes. `[Manage]`
- **S8.** As a user, I can open a logged expense and view both its colour photo and its B&W scan, so that I can check the source receipt. `[Manage]`
- **S9.** As a user, I can pick a start and end date and generate the submission package — a combined PDF (invoice → expense detail → merged receipt scans) plus an Excel sheet, both downloaded to my device, with an auto-incremented invoice number — so that I can email it to Macquarie Finance. `[Report, Steps 1,3–6]`
- **S10.** As a user, generating a report marks its included expenses "Submitted" so that they don't appear in the next report. `[Report, Step 7]`
- **S11.** As a user, I can see a history of generated reports (period, invoice number, total, files) and re-download a report's files, so that I can resend if needed. `[Archive & Backup, Steps 1–2]`
- **S12.** As a user, I can mark a report "Paid" to archive it, and I can delete a not-yet-paid report (which returns its expenses to the unsubmitted pool) so that a mistaken report can be regenerated. `[Archive & Backup, Step 3]`
- **S13.** As a user, I can export all my data to a single file and import it on another device to fully restore everything (settings, expenses, both image sets, report history), so that I never depend on a server copy for backup. `[Archive & Backup, Steps 4–7]`

## UI Requirements

Every screen + every unique state. Behavior and key elements only — visual treatment lives in the design file.

| Screen | State | Key UI Elements | Primary User Action |
|--------|-------|-----------------|---------------------|
| Setup | Default | One page; sections: Profile (name, address 1, address 2, phone, invoice prefix, vendor ID), Invoice To (recipient name default "Macquarie University", address, email), Bank Details (account name, number, SWIFT/BIC, bank name), Country Codes (editable list of country → account-code rows; add/edit/delete), Currency Markup (% number, default 3). Save indicator. | Fill fields; add/edit/delete country codes; save |
| Setup | First-run | Country Codes seeded with editable example rows (VN/TH/KH/MM/AU); other fields empty with helper hints | Complete profile before first capture |
| Setup | Error | Per-field validation (e.g. markup must be a non-negative number; required profile fields flagged before a report can be generated) | Correct flagged fields |
| Capture | Default / Empty | Drop zone + "Add receipts" button; on mobile a "Take photo" affordance using the device camera; accepted-format hint (PDF + common images); supports multi-file selection | Add one or more receipt files |
| Capture | Queue / Reviewing | A queue indicator ("Receipt 2 of 5"); current receipt preview; pre-filled review form (date, amount, detected currency, converted VND, country picker from configured codes, description, notes); confirm + skip/remove controls | Review, correct, Save → advances to next |
| Capture | Reading (loading) | Per-receipt reading indicator while AI reads + scan is produced; the rest of the queue waits | Wait; cancel current allowed |
| Capture | Low-confidence / read failure | Review form shown with unread fields blank and visibly flagged; receipt preview prominent so user can read it manually | Type the missing date/amount, then Save |
| Capture | Error | File rejected (unsupported format / too large) → inline message naming the problem, receipt stays in queue as failed; server/AI unavailable → message + retry, no expense saved silently | Fix file or retry |
| Capture | Saved | Brief confirmation per receipt ("Saved — 208,500 VND"); queue advances; when queue empties, return to Capture default | Continue or finish |
| Expenses (Manage) | Default | Table/list of expenses: date, description, amount VND, original amount+currency, exchange rate, country/account code, status, receipt thumbnail; filter controls (date range, country, status), description search; an "Export CSV" quick action (dumps the visible log; separate from the report Excel); row actions: view, edit, delete | Browse, filter, search, export CSV |
| Expenses | Empty | "No expenses yet" + prompt/link to Capture | Go to Capture |
| Expenses | Edit | Editable form for one expense (all fields incl. country/account code, notes); re-convert if amount/currency changed | Save changes |
| Expenses | View receipt | Viewer showing both the colour photo and the B&W scan for the expense | Inspect, close |
| Expenses | Delete confirm | Confirmation dialog naming the expense | Confirm/cancel delete |
| Reports — Create | Default | Start date + end date pickers; an editable invoice-number field (pre-filled with the suggested next number); list of unsubmitted expenses in range, each with an include checkbox (all checked by default); running total of checked items; "Generate" button (disabled if profile incomplete or zero checked, with reason shown) | Pick range, choose which expenses, edit invoice no. if needed, Generate |
| Reports — Create | Generating (loading) | Progress indicator while the server assembles the package | Wait |
| Reports — Create | Success | Confirmation with invoice number + total; both files auto-download; expenses marked Submitted | Download / go to History |
| Reports — Create | Error | Assembly failure → message, nothing marked Submitted, no partial download | Retry |
| Reports — History | Default | List of generated reports: period, invoice number, total, generated date, status (Generated/Paid); actions: re-download files, Mark Paid, Delete (only if not Paid) | Re-download / mark paid / delete |
| Reports — History | Empty | "No reports yet" + link to Create | Go to Create |
| Reports — History | Mark Paid confirm | Confirm "Macquarie paid invoice [number]?" | Confirm → archived/locked |
| Backup | Default | "Export all data" button (downloads one file); "Import" file picker with a clear warning that import replaces current data | Export or import |
| Backup | Importing | Progress + result summary (counts restored: expenses, reports, images) | Confirm completion |
| Backup | Import error | Invalid/corrupt file → message, no data changed | Pick a valid file |
| App shell / Home | Default | Desktop: fixed left sidebar (Setup · Capture · Expenses · Reports · Backup, 1–5 shortcuts; "LOCAL · THIS DEVICE" card; minimal account slot reserved for Phase 2). Main area is a light Home/landing: greeting + a few at-a-glance counts (unsubmitted count+sum, this-trip count+sum, pending-payment invoice+sum, all computed locally) + recent expenses + Add-receipts CTA. No Phase-2 account nodes drawn. | Navigate; add receipts |
| App shell / Home | Mobile | Bottom nav with a center capture FAB; greeting + drop/add area + recent; primary "add receipt" reachable in one tap; no horizontal scroll | Navigate, capture |

## Data Model

All data lives client-side in IndexedDB (via Dexie). The server persists nothing.

```
profile (single record)
- invoicePrefix: string — e.g. "HBEXPENSE" (used to seed the suggested invoice number)
- vendorId: string — required by the Macquarie invoice header
- submitter: { name, email, jobTitle, phone, addressLine1, addressLine2, country }
    (email = submitter contact email; jobTitle = optional, not used by the invoice;
     name/phone/addressLine1/addressLine2/country populate the invoice "From" block)
- invoiceTo: { name (default "Macquarie University"), address, email }
- bank: { accountName, accountNumber, swift, bankName }
- currencyMarkupPct: number — default 3
- homeCurrency: string — fixed "VND" in Phase 1
- updatedAt: number

(Note: the design's Setup surfaces a representative subset of these visually; backend
 must still collect every field listed here so the generated invoice matches the
 existing Macquarie-accepted template. See handover.md Deviation 4.)

countryCode
- id: string
- country: string — e.g. "Vietnam"
- accountCode: string — full label as used on the expense row, e.g. "Vietnam: 8741-4105"
- sortOrder: number
(seeded on first run: VN→"Vietnam: 8741-4105", TH→"Thailand: 8741-4103", KH→"Cambodia: 8741-4109", MM→"Myanmar: 8741-4108", AU→"Australia: 8741-XXXX" — all editable)

expense
- id: string
- date: string (YYYY-MM-DD) — transaction date
- description: string
- amountVND: integer — converted, rounded to whole VND
- originalAmount: number | null — amount as printed on receipt
- originalCurrency: string | null — e.g. "THB"; null/"VND" if already VND
- exchangeRate: number | null — VND per 1 unit of originalCurrency, after markup
- rateSource: string — e.g. "xe.com +3%"
- country: string — selected country (links to a countryCode)
- accountCode: string — the account-code label copied from the chosen countryCode
- notes: string
- status: "pending" | "submitted"
- invoiceNumber: string | null — set when submitted
- reportId: string | null — the report it was submitted in
- originalImageId: string — FK to image (colour)
- bwScanId: string — FK to image (B&W scan used in the package)
- createdAt: number

image
- id: string
- expenseId: string
- kind: "original" | "bwscan"
- mimeType: string — e.g. "image/jpeg", "application/pdf"
- blob: Blob — the binary, stored in IndexedDB
(both the colour original and the B&W scan are stored; nothing on the server)

report
- id: string
- invoiceNumber: string — {prefix}{YY}-{n}
- periodStart: string (YYYY-MM-DD)
- periodEnd: string (YYYY-MM-DD)
- periodLabel: string — human label e.g. "Jan 2026 - Mar 2026"
- totalVND: integer
- expenseIds: string[]
- status: "generated" | "paid"
- generatedAt: number
- paidAt: number | null
- combinedPdf: Blob | null — cached generated combined PDF (re-downloadable)
- expenseXlsx: Blob | null — cached generated Excel
```

**Invoice numbering rule (preserved from `generate_report.py`, made editable per the design):** the app **suggests** `{invoicePrefix}{YY}-{n}` where `YY` = two-digit year from the report-generation date and `n` = (highest `n` among this user's reports whose invoice year == current year) + 1; new year → counter starts at 1; computed client-side from the local `report` records (no DONE/ folder). On the Reports/Create screen this suggested number is shown in an **editable** field — the user may override it before generating (design frame `Gxsbs`). The value actually used is stored on the `report`.

## API Contracts

The server is stateless. Every endpoint holds inputs in memory only for the duration of the request and writes nothing to server disk.

### Process Receipt (read + scan)
- **Method + path:** `POST /api/process-receipt`
- **Auth required:** No
- **Request body:** `multipart/form-data` — `file`: the receipt (PDF or image)
- **Behavior:** Reads the date/amount/currency by shelling out to `claude -p` on homepc-1 (Tesseract OCR fallback only if `claude -p` is unavailable); separately produces a cleaned black-and-white scan (grayscale, auto-crop, deskew, contrast) matching `scan_receipt.py`. For a PDF input, reads it directly and produces a B&W version for the package. Discards the uploaded file from memory after responding.
- **Success response:** `{ reading: { date: string|null, amount: number|null, currency: string|null, confidence: "high"|"low" }, bwScan: { mimeType: string, dataBase64: string } }` — status 200. Any field the AI could not read is `null` with `confidence: "low"` (client shows the field blank for manual entry).
- **Error responses:**
  - `400`: missing/empty file, or unsupported format — `{ error: "unsupported file type" }`
  - `413`: file too large — `{ error: "file exceeds size limit" }`
  - `422`: file received but unreadable as a receipt (still returns the bwScan if it could be produced) — `{ error: "could not read receipt", bwScan?: {...} }`
  - `503`: receipt-reading engine (`claude -p`) unavailable and no fallback — `{ error: "reader unavailable" }`
  - `500`: unexpected server error

### Get FX Rate
- **Method + path:** `GET /api/fx`
- **Auth required:** No
- **Query params:** `?from=THB&to=VND`
- **Behavior:** Fetches the xe.com rate for the currency pair; cached in server memory for 1 hour. Returns the **raw** rate; the client applies the user's markup. (`to` is always `VND` in Phase 1 but accepted as a param.)
- **Success response:** `{ rate: number, from: string, to: string, source: "xe.com", fetchedAt: string }` — status 200
- **Error responses:**
  - `400`: unknown/invalid currency code — `{ error: "invalid currency" }`
  - `502`: xe.com unreachable / rate not parseable — `{ error: "rate source unavailable" }`
  - `500`: unexpected server error

### Generate Report Package
- **Method + path:** `POST /api/generate-report`
- **Auth required:** No
- **Request body:** `application/json` —
  ```
  {
    profile: { invoicePrefix, vendorId, submitter{...}, invoiceTo{...}, bank{...} },
    invoiceNumber: string,
    periodLabel: string,
    expenses: [ { date, description, amountVND, accountCode, notes,
                  originalAmount, originalCurrency, exchangeRate, rateSource } ],
    receipts: [ { expenseRef: string, mimeType: string, dataBase64: string } ]  // B&W scans, in expense order
  }
  ```
- **Behavior:** Builds the invoice xlsx (from the bundled template), the expense-detail xlsx (sorted by date, per-account-code subtotals, grand total), converts both to PDF, merges the receipt scans, and combines into one PDF in order **invoice → expense detail → receipts** — matching `generate_report.py` exactly. Returns the combined PDF and the expense Excel. Writes nothing to disk; discards all inputs after responding.
- **Success response:** `{ combinedPdf: { filename: string, dataBase64: string }, expenseXlsx: { filename: string, dataBase64: string } }` — status 200
- **Error responses:**
  - `400`: missing required profile fields or malformed body — `{ error: "missing field: <name>" }`
  - `422`: zero expenses supplied — `{ error: "no expenses to report" }`
  - `500`: assembly failure (template missing, conversion engine failed, etc.) — `{ error: "report assembly failed", detail: string }`

### Health
- **Method + path:** `GET /api/health`
- **Auth required:** No
- **Success response:** `{ status: "ok", reader: "claude" | "tesseract" | "unavailable" }` — status 200. Lets the UI warn if receipt reading is degraded.

## Constraints & Context

- **Local-first, server-persists-nothing** (tech-stack non-negotiable): all profile, expense, image, and report data live in the browser's IndexedDB. The server is stateless between requests; no request content is logged or written to disk.
- **Receipt privacy:** an uploaded image/PDF lives in server RAM only for the duration of the `claude -p`/scan call; never written to server disk, never returned to any other client.
- **Output must match the existing pipeline exactly:** combined-PDF order (invoice → expense detail → receipts), the expense-detail xlsx layout (columns #, Date, Description, Account Code, Amount (VND), Notes; per-account-code subtotals; grand total; A4 portrait), the invoice template fields, the Notes conversion string format (`"<amt> <CUR> × <rate> = <vnd> VND [xe.com +<markup>%]"`), and the invoice-number format. Do not change formats without explicit user sign-off.
- **Currency:** the AI reads the actual currency printed on the receipt; VND conversion = raw xe.com rate × (1 + markupPct/100). The selected **country** sets the account-code label only, not the currency. If receipt currency differs from the country's usual currency, the receipt's currency wins for conversion.
- **Amounts** are stored and reported as whole VND (rounded), matching `add_expense.py`.
- **OS-agnostic:** must work in Chrome, Safari, Firefox on macOS, Windows, iOS, Android. No desktop-only browser APIs; camera capture via standard web file/camera input.
- **Strict TypeScript from commit 1; dependencies pinned exactly** (tech-stack non-negotiables).
- **Reuse the proven Python pipeline** (`scan_receipt.py`, `generate_report.py` logic and the bundled xlsx templates) on the server rather than reimplementing the math/format.

## Excluded from This Phase

- Any account, login, invite, or multi-user capability (Phase 2).
- Manual/no-receipt expense entry — every expense starts from a receipt file.
- In-app emailing of the report — the user downloads and emails it themselves.
- Any Macquarie Finance system integration.
- Any server-side storage, database, cloud sync, or backup copy.
- A per-user reporting currency — VND is fixed in Phase 1.
- A built-in global country-code library — the user manages their own codes (defaults seeded as editable examples).
- Native mobile apps — web only (must work well in mobile browsers).
