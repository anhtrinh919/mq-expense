# Phase 1 Frontend Handover — MQ Expense (Single-User Expense Flow)

## Design file — source of truth

> **This handover is an index. The design file is the specification.**
> Backend must open the design file and build UI from it — frame by frame, node by node. The handover describes structure and mappings; the design file describes visuals, layout, spacing, typography, and interaction affordances. Where the two differ, **the design file wins**.

- **Path:** `pencil/v0.1.pen` (project-relative)
- **Tool:** Pencil (schema 2.13)
- **How to read it:**
  - **Primary (reliable on this machine): read the `.pen` directly as JSON.** It is plain JSON with top-level keys `version`, `children` (an array of frame nodes — each has `id`, `name`, `type`, `width`, `height`, `children`), and `variables` (the design-token map). Navigate by frame `name` (unique, human-readable — e.g. `"B · 05 Capture — Reviewing"`) or `id` (see frame index). Parse with `python3 -c "import json; d=json.load(open('pencil/v0.1.pen'))"` or equivalent.
  - **Alternative:** the Pencil MCP (`mcp__pencil__*`) if the desktop app is reachable. Note the MCP read tools operate on the *focused* tab, not the `filePath` arg — direct JSON read avoids that friction. The MCP "encryption" claim is false; direct JSON read is correct and is how `design-tokens.css` was generated.
  - To verify a frame visually, render it from the JSON node geometry, or open `pencil/v0.1.pen` in the Pencil app.

## Design tokens

- **Tokens file:** `specs/2026-06-04-single-user-flow/design-tokens.css`
- **Generated from:** direct read of the `.pen` `variables` map (41 tokens) on 2026-06-04.
- **Includes:** surface/canvas/border colors, text colors, accent (+hover/+soft), a full status palette (unsubmitted / submitted / paid / attention / error, each with a paired `-bg`), font families, radius scale (sm/md/lg/xl), spacing scale (1–12).
- **How backend uses it:** copy `design-tokens.css` into the app and `@import` it from the global stylesheet; reference via CSS variables (`var(--accent)`, `var(--bg-canvas)`, `var(--space-4)`). Number tokens are emitted with `px` units. **Do not** duplicate hex values into component styles or Tailwind classes — reference the variables.

## Fonts

All three are on Google Fonts. Backend wires font loading once and points the `--font-*` variables at the loaded families.

| Role | Family | Weights used |
|------|--------|--------------|
| Body / UI | **Inter** (`--font-sans`) | 400, 500, 600 |
| Display / headings | **Instrument Serif** (`--font-display`) | 400 |
| Monospace — money, currencies, rates, account codes, invoice numbers | **JetBrains Mono** (`--font-mono`) | 400, 500 |

> **Money legibility is load-bearing:** all amounts (VND + original), exchange rates, account codes, and invoice numbers render in JetBrains Mono / tabular figures so digits align in lists and totals. This is a non-negotiable from the brief — honor it everywhere numbers appear.

## What was designed

A complete, calm light-mode utility app on a warm paper canvas with a muted forest-green accent. **Desktop** uses a fixed left **Sidebar** (nav for Setup/Capture/Expenses/Reports/Backup with 1–5 keyboard shortcuts, a "LOCAL · THIS DEVICE" reassurance card, and a minimal account slot reserved for Phase 2). **Mobile** uses a bottom nav with a center capture FAB. All 26 desktop states from the spec are designed, plus a light **Home/landing** surface (greeting + a few at-a-glance counts + recent expenses) and **9 dedicated mobile screens** (Capture empty/reviewing/saved, Expenses list, Expense edit, Receipt viewer, Setup, Reports create/history) as a mobile foundation. Capture is the hero: a receipt viewer (Colour/B&W toggle) beside a pre-filled inspector, with reading / low-confidence / file-error / saved states and a review queue.

## Frame index

Every `requirements.md` UI Requirements state maps to a design frame. Reference by `id` or `name` in `pencil/v0.1.pen`.

| Requirement state | Design frame (id) | Frame name | Notes |
|-------------------|-------------------|------------|-------|
| Setup — Default | `DEpmR` | A · 01 Setup — Default | Returning state, all sections filled |
| Setup — First-run | `cEerq` | A · 02 Setup — First-run | Seeded country codes, "1/5 sections done" progress, welcome intro |
| Setup — Error | `pUdkr` | A · 03 Setup — Error | Incomplete-profile banner + per-section flags ("Jump to first issue") |
| Capture — Default / Empty | `Ekyru` | B · 04 Capture — Default / Empty | Drop zone, Choose files / Paste, mobile-camera note, format/size tips |
| Capture — Queue / Reviewing | `mzwv4` | B · 05 Capture — Reviewing | Viewer (Colour/B&W) + Inspector form; "2 of 5"; Save / Save&next / Skip |
| Capture — Reading (loading) | `irSnA` | B · 06 Capture — Reading | Scan-line overlay; fields fill in as read |
| Capture — Low-confidence | `if8ah` | B · 07 Capture — Low-confidence | "Couldn't read N fields" banner; blank flagged fields; zoom hint |
| Capture — Error | `pIi2m` | B · 08 Capture — Error | File-not-readable card; Remove / Replace; rest of queue unaffected |
| Capture — Saved | `yfPxQ` | B · 09 Capture — Saved | Saved card with VND + original; Undo (5s); next-up; queue rail |
| Expenses — Default | `GZKAO` | C · 10 Expenses — Default | Filter bar (Date/Country/Status/Search) + table (Date, Desc, Original, Rate, VND, Ctry, Status, actions); "Export CSV"; summary total |
| Expenses — Empty | `GjmYF` | C · 11 Expenses — Empty | "No expenses yet" + Capture CTA |
| Expenses — Edit | `SaqUI` | C · 12 Expenses — Edit | Split list + edit form (all fields) |
| Expenses — View receipt | `F5HaS` | C · 13 Expenses — Receipt viewer | Modal: ORIGINAL·COLOUR + SCAN·B&W side-by-side / toggle; Download |
| Expenses — Delete confirm | `MKAU9` | C · 14 Expenses — Delete confirm | Dialog; "photo and scan will also be removed" |
| Reports/Create — Default | `Gxsbs` | D · 15 Reports/Create — Default | Start/End date, **editable Invoice number**, "Will include" summary, **per-expense include checkboxes** on the in-range list |
| Reports/Create — Generating | `v9ILc` | D · 16 Reports/Create — Generating | Progress + steps (reading→converting→combined PDF→Excel→stamp invoice) |
| Reports/Create — Success | `UemuK` | D · 17 Reports/Create — Success | Invoice + stats + files; New report |
| Reports/Create — Error | `yNvGE` | D · 18 Reports/Create — Error | "Assembly stopped — nothing was changed" |
| Reports/History — Default | `LtjrD` | D · 19 Reports/History — Default | Stat row (total/awaiting/paid) + table; row actions: re-download, mark paid |
| Reports/History — Empty | `gybei` | D · 20 Reports/History — Empty | "No reports yet" + Create CTA |
| Reports/History — Mark Paid confirm | `e0IC6` | D · 21 Reports/History — Mark Paid | Dialog; "Marking as Paid locks the report" |
| Backup — Default | `Nex2m` | E · 22 Backup — Default | Reassurance, Export card (file `*.mqx`, contents list), Import dropzone + warning |
| Backup — Importing | `AMREU` | E · 23 Backup — Importing | Progress ("Restoring receipt images N of M"), "DO NOT CLOSE THIS TAB" |
| Backup — Import error | `z4QJD9` | E · 24 Backup — Import error | "Not a valid backup; nothing changed"; common causes |
| App shell — Default (Home) | `ah7A9` | F · 25 App shell — Desktop | **Home/landing** — greeting + quick-stat cards (Unsubmitted, This trip, Pending payment) + Recent expenses + Add receipts. See Deviation 2. |
| App shell — Mobile | `kvjJO` | F · 26 App shell — Mobile | Bottom nav + center capture FAB; greeting + dropzone + recent |
| *(component)* App Shell Sidebar | `cyT52` | AppShell Sidebar | Desktop nav rail — reusable, see Reusable components |

**Mobile foundation screens (added by the designer — build mobile layouts from these):**

| Mobile screen | Frame (id) | Covers |
|---|---|---|
| Capture — Empty | `h6BSc` | M · 1 — add-method chooser (camera / gallery / paste) |
| Capture — Reviewing (hero) | `NGyVh` | M · 2 — full-screen receipt hero + bottom sheet inspector |
| Capture — Saved | `DgLjo` | M · 3 — saved card + next-up |
| Expenses — List | `oP6Uy` | M · 4 — search + filter chips + rows |
| Expense — Edit | `l5ywS` | M · 5 — edit sheet (date/amount/currency/country/desc/converted) |
| Receipt — Viewer | `qWplx` | M · 6 — Colour/B&W toggle + meta + Edit |
| Setup | `U7agsX` | M · 7 — section list (Profile/Invoice To/Bank/Country codes/Markup) |
| Reports/Create | `eu5wW` | M · 8 — dates + editable invoice + in-range list |
| Reports/History | `KChHr` | M · 9 — filter tabs + report rows with re-download/mark-paid actions |

## Reusable components

Backend should implement these once and reuse — do not inline-duplicate per screen.

| Component | Design node (id) | Used in |
|-----------|------------------|---------|
| AppShell Sidebar (desktop nav rail) | `cyT52` | every desktop screen (referenced as `ref:Sidebar`) |
| Mobile bottom nav + capture FAB | within `kvjJO` | every mobile screen |
| Status chip (unsubmitted / submitted / paid / attention) | within `GZKAO`, `yfPxQ`, `qWplx` | Expenses, Capture saved, Reports, Receipt viewer |
| Expense row (list-row + in-range-review variants) | within `GZKAO` / `Gxsbs` | Expenses list, Reports/Create in-range list |
| Receipt viewer (Colour/B&W toggle, side-by-side) | `F5HaS` (desktop) / `qWplx` (mobile) | Expenses, Capture |
| Capture queue item / queue rail | within `yfPxQ` | Capture reviewing/saved |
| Stat card | within `ah7A9`, `LtjrD` | Home, Reports/History |

## Deviations from requirements spec

The design (canon, per the user) diverges from `requirements.md` in these ways. None require a new API. `requirements.md` has been updated to match where it affects the functional contract.

- **Deviation 1 — Sidebar + mobile bottom-nav layout.** Desktop is a left sidebar (not a top header); mobile is a bottom nav with a center capture FAB. **Impact:** none — UI structure only; build from frames `cyT52` / `kvjJO`.
- **Deviation 2 — Home/landing surface added.** The "App shell — Default" is a light Home screen (greeting + quick-stat cards: Unsubmitted count+sum, This-trip count+sum, Pending-payment invoice+sum; + Recent expenses + Add-receipts CTA). The brief had said "no dashboard"; the user intentionally added a light landing. **Impact:** the stat values are **computed client-side from local IndexedDB data** — no new API, no server call. Build it; keep it light (no charts/analytics).
- **Deviation 3 — Reports/Create per-expense include + editable invoice number.** The in-range list has per-expense **checkboxes** so the user selects which unsubmitted-in-range expenses to include (not strictly "all in range"). The **invoice number is an editable field** with a suggested default. **Impact:** the suggested invoice number must default to the existing format `{prefix}{YY}-{n}` (e.g. `HBEXPENSE26-2`) for Finance continuity — derive the suggestion by incrementing the most recent report's trailing counter (year rolls per the existing rule); the user may edit it before generating. Only the **checked** expenses are sent to `/api/generate-report` and marked Submitted.
- **Deviation 4 — Setup field set.** The design's Setup visually shows Profile = Full name / Email / Job title, Invoice To = Recipient / Address / City-Postcode, Bank = Bank / Account holder / Account no. / SWIFT-BIC, + Currency markup. The design's field list is **illustrative, not exhaustive** — the Macquarie invoice template (`/tmp/cowork-ref/expense-report/assets/expense_invoice_template.xlsx`) also requires the **submitter's own address (2 lines) + country, phone, and Vendor ID**, plus the invoice prefix. **Impact (functional):** backend must collect **all invoice-required fields** within the design's Setup sections/style (add submitter address/phone/country/vendor-ID to the Profile area; email is the submitter contact email; job title is a new optional field unused by the invoice). The data model in `requirements.md` carries the full field set. Do not drop invoice fields, or the generated invoice loses header data Finance currently receives.
- **Deviation 5 — Expenses "Export CSV" quick action.** The Expenses screen has an Export-CSV button (a quick dump of the visible log) in addition to the full Excel produced by report generation. **Impact:** small client-side CSV export; the report Excel is unchanged.
- **Deviation 6 — Backup file extension `.mqx`.** The export uses a `.mqx` filename; import validates the `.mqx` manifest and rejects generic `.zip`. **Impact:** name the export `.mqx`; carry images inside per the data model.

## Layout / IA notes

- **Desktop = fixed left sidebar; mobile = bottom nav + center capture FAB.** Build the sidebar (`cyT52`) once; every desktop screen references it. The account slot in the sidebar footer and the Phase-2 nav room are intentional — leave them, do not fill them in Phase 1.
- **Home is the default landing on both desktop and mobile** (frames `ah7A9` / `kvjJO`), with Capture one tap away.
- **Receipt viewer always pairs Colour + B&W** (toggle on mobile, side-by-side on desktop).

## API contracts expected from backend

Pulled directly from `requirements.md` API Contracts — implement exactly. **No new API contracts surfaced from the design** (all deviations are client-side / computed from local data).

### Process Receipt (read + scan)
- **Request:** `POST /api/process-receipt` (multipart, `file`)
- **Auth required:** No
- **Expected success:** `{ reading: { date, amount, currency, confidence }, bwScan: { mimeType, dataBase64 } }` — 200
- **Expected errors:** `400` unsupported/empty; `413` too large; `422` unreadable (may still return `bwScan`); `503` reader unavailable; `500`

### Get FX Rate
- **Request:** `GET /api/fx?from=THB&to=VND`
- **Auth required:** No
- **Expected success:** `{ rate, from, to, source:"xe.com", fetchedAt }` — 200 (raw rate; client applies markup)
- **Expected errors:** `400` invalid currency; `502` source unavailable; `500`

### Generate Report Package
- **Request:** `POST /api/generate-report` (JSON: profile, invoiceNumber, periodLabel, expenses[], receipts[] B&W scans)
- **Auth required:** No
- **Expected success:** `{ combinedPdf:{filename,dataBase64}, expenseXlsx:{filename,dataBase64} }` — 200
- **Expected errors:** `400` missing field; `422` no expenses; `500` assembly failed

### Health
- **Request:** `GET /api/health`
- **Auth required:** No
- **Expected success:** `{ status:"ok", reader:"claude"|"tesseract"|"unavailable" }` — 200
